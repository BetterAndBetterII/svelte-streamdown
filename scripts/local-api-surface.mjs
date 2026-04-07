import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parse as parseSvelte } from 'svelte/compiler';
import ts from 'typescript';
import { listStandalonePluginPackages } from './lib/workspace-packages.mjs';

const scriptFile = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(scriptFile), '..');
const entryFile = join(repoRoot, 'src', 'lib', 'index.ts');
const streamdownComponentFile = join(repoRoot, 'src', 'lib', 'Streamdown.svelte');
const streamdownContextFile = join(repoRoot, 'src', 'lib', 'context.svelte.ts');
const streamdownPluginsFile = join(repoRoot, 'src', 'lib', 'plugins.ts');
const fixturePath = join(repoRoot, 'fixtures', 'parity', 'local-api-surface.json');

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const sourceFileCache = new Map();
const analysisCache = new Map();
const textCache = new Map();
let programCache = null;
let checkerCache = null;

function readJson(filePath) {
	return JSON.parse(readFileSync(filePath, 'utf8'));
}

function readScriptText(filePath) {
	if (!textCache.has(filePath)) {
		const sourceText = readFileSync(filePath, 'utf8');

		if (!filePath.endsWith('.svelte')) {
			textCache.set(filePath, sourceText);
			return textCache.get(filePath);
		}

		const parsed = parseSvelte(sourceText);
		const instance = parsed.instance?.content;
		if (!instance) {
			throw new Error(`Missing instance script in ${filePath}`);
		}

		textCache.set(filePath, sourceText.slice(instance.start, instance.end));
	}

	return textCache.get(filePath);
}

function readSourceFile(filePath) {
	if (!sourceFileCache.has(filePath)) {
		const sourceText = readScriptText(filePath);
		const scriptKind = filePath.endsWith('.tsx')
			? ts.ScriptKind.TSX
			: filePath.endsWith('.jsx')
				? ts.ScriptKind.JSX
				: ts.ScriptKind.TS;

		sourceFileCache.set(
			filePath,
			ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind)
		);
	}

	return sourceFileCache.get(filePath);
}

function toPosixPath(filePath) {
	return filePath.replaceAll('\\', '/');
}

function relativePath(filePath) {
	return toPosixPath(relative(repoRoot, filePath));
}

function normalizeText(text) {
	return text
		.replaceAll(/\s+/g, ' ')
		.replaceAll(/\s*([{}()[\]<>,?:;&|=])\s*/g, '$1')
		.replaceAll(/,}/g, '}')
		.replaceAll(/,]/g, ']')
		.replaceAll(/React\./g, '')
		.replaceAll(/\bimport\([^)]*\)\./g, '')
		.trim();
}

function normalizeRepositoryUrl(value) {
	if (typeof value !== 'string') {
		return null;
	}

	return value.replace(/^git\+/, '');
}

function normalizePropTypeText(typeText, optional) {
	let normalized = normalizeText(typeText);

	if (optional) {
		normalized = normalized.replace(/\|undefined\b/g, '').replace(/\bundefined\|/g, '');
		normalized = normalized.replace(/\|\|/g, '|').replace(/^\|/, '').replace(/\|$/, '');
	}

	return normalized;
}

function printNode(node, sourceFile) {
	return normalizeText(printer.printNode(ts.EmitHint.Unspecified, node, sourceFile));
}

function resolveModuleToFile(baseFilePath, moduleSpecifier) {
	if (!moduleSpecifier.startsWith('.')) {
		return null;
	}

	const rawBasePath = resolve(dirname(baseFilePath), moduleSpecifier);
	const withoutJsExtension = moduleSpecifier.match(/\.(?:[cm]?js)$/)
		? rawBasePath.replace(/\.(?:[cm]?js)$/, '')
		: rawBasePath;
	const withoutDtsExtension = moduleSpecifier.endsWith('.d.ts')
		? rawBasePath.replace(/\.d\.ts$/, '')
		: rawBasePath;

	const candidateBases = [...new Set([rawBasePath, withoutJsExtension, withoutDtsExtension])];
	const candidates = [];

	for (const candidateBase of candidateBases) {
		candidates.push(
			candidateBase,
			`${candidateBase}.ts`,
			`${candidateBase}.tsx`,
			`${candidateBase}.mts`,
			`${candidateBase}.cts`,
			`${candidateBase}.js`,
			`${candidateBase}.mjs`,
			`${candidateBase}.cjs`,
			`${candidateBase}.svelte`,
			`${candidateBase}.svelte.ts`,
			`${candidateBase}.svelte.js`,
			join(candidateBase, 'index.ts'),
			join(candidateBase, 'index.tsx'),
			join(candidateBase, 'index.mts'),
			join(candidateBase, 'index.cts'),
			join(candidateBase, 'index.js')
		);
	}

	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	return null;
}

function getExportModifier(statement) {
	return (
		statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false
	);
}

function analyzeSourceFile(filePath) {
	if (analysisCache.has(filePath)) {
		return analysisCache.get(filePath);
	}

	const sourceFile = readSourceFile(filePath);
	const imports = new Map();
	const localDeclarations = new Map();
	const exports = [];

	for (const statement of sourceFile.statements) {
		if (ts.isImportDeclaration(statement) && statement.importClause) {
			const moduleSpecifier = statement.moduleSpecifier.text;
			const resolvedFilePath = resolveModuleToFile(filePath, moduleSpecifier);

			if (statement.importClause.name) {
				imports.set(statement.importClause.name.text, {
					importedName: 'default',
					moduleSpecifier,
					resolvedFilePath
				});
			}

			const namedBindings = statement.importClause.namedBindings;
			if (namedBindings && ts.isNamedImports(namedBindings)) {
				for (const element of namedBindings.elements) {
					imports.set(element.name.text, {
						importedName: element.propertyName?.text ?? element.name.text,
						moduleSpecifier,
						resolvedFilePath
					});
				}
			}
		}

		if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
			localDeclarations.set(statement.name.text, statement);
		}

		if (ts.isFunctionDeclaration(statement) && statement.name) {
			localDeclarations.set(statement.name.text, statement);
		}

		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) {
					localDeclarations.set(declaration.name.text, declaration);
				}
			}
		}

		if (
			ts.isExportDeclaration(statement) &&
			statement.exportClause &&
			ts.isNamedExports(statement.exportClause)
		) {
			const moduleSpecifier = statement.moduleSpecifier?.text ?? null;
			for (const element of statement.exportClause.elements) {
				const exportName = element.name.text;
				const importedName = element.propertyName?.text ?? exportName;
				exports.push({
					name: exportName,
					kind: statement.isTypeOnly || element.isTypeOnly ? 'type' : 'value',
					source: moduleSpecifier,
					importedName
				});
			}
		}

		if (!getExportModifier(statement)) {
			continue;
		}

		if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
			exports.push({
				name: statement.name.text,
				kind: 'type',
				source: null,
				importedName: statement.name.text
			});
			continue;
		}

		if (ts.isFunctionDeclaration(statement) && statement.name) {
			exports.push({
				name: statement.name.text,
				kind: 'value',
				source: null,
				importedName: statement.name.text
			});
			continue;
		}

		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) {
					exports.push({
						name: declaration.name.text,
						kind: 'value',
						source: null,
						importedName: declaration.name.text
					});
				}
			}
		}
	}

	const analysis = { sourceFile, imports, localDeclarations, exports };
	analysisCache.set(filePath, analysis);
	return analysis;
}

function collectPackageExports(packageJson) {
	return Object.entries(packageJson.exports)
		.map(([subpath, target]) => ({
			subpath,
			target
		}))
		.sort((left, right) => left.subpath.localeCompare(right.subpath));
}

function extractExports(filePath) {
	const { exports } = analyzeSourceFile(filePath);
	const unique = new Map();

	for (const entry of exports) {
		const key = `${entry.kind}:${entry.name}:${entry.source ?? ''}:${entry.importedName}`;
		unique.set(key, entry);
	}

	return [...unique.values()].sort((left, right) => {
		return (
			left.kind.localeCompare(right.kind) ||
			left.name.localeCompare(right.name) ||
			(left.source ?? '').localeCompare(right.source ?? '') ||
			left.importedName.localeCompare(right.importedName)
		);
	});
}

function getTypeChecker() {
	getTypeScriptProgram();
	return checkerCache;
}

function findTypeDeclaration(filePath, typeName) {
	const sourceFile = getTypeScriptProgram().getSourceFile(filePath);
	if (!sourceFile) {
		throw new Error(`Unable to load TypeScript source file: ${filePath}`);
	}

	for (const statement of sourceFile.statements) {
		if (ts.isTypeAliasDeclaration(statement) && statement.name.text === typeName) {
			return statement;
		}
		if (ts.isInterfaceDeclaration(statement) && statement.name.text === typeName) {
			return statement;
		}
	}

	return null;
}

function resolveTypeDeclaration(filePath, typeName) {
	const declaration = findTypeDeclaration(filePath, typeName);
	if (declaration) {
		return { filePath, declaration };
	}

	const { imports } = analyzeSourceFile(filePath);

	const imported = imports.get(typeName);
	if (!imported?.resolvedFilePath) {
		return null;
	}

	return resolveTypeDeclaration(imported.resolvedFilePath, imported.importedName);
}

function getTypeScriptProgram() {
	if (programCache && checkerCache) {
		return programCache;
	}

	const configPath = ts.findConfigFile(repoRoot, ts.sys.fileExists, 'tsconfig.json');
	if (!configPath) {
		throw new Error('Unable to locate tsconfig.json for API surface analysis');
	}

	const config = ts.readConfigFile(configPath, ts.sys.readFile);
	if (config.error) {
		throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
	}

	const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, repoRoot);
	programCache = ts.createProgram({
		rootNames: parsed.fileNames,
		options: parsed.options
	});
	checkerCache = programCache.getTypeChecker();
	return programCache;
}

function findTypeAliasDeclaration(filePath, typeName) {
	const sourceFile = getTypeScriptProgram().getSourceFile(filePath);
	if (!sourceFile) {
		throw new Error(`Unable to load TypeScript source file: ${filePath}`);
	}

	for (const statement of sourceFile.statements) {
		if (ts.isTypeAliasDeclaration(statement) && statement.name.text === typeName) {
			return statement;
		}
		if (ts.isInterfaceDeclaration(statement) && statement.name.text === typeName) {
			return statement;
		}
	}

	return null;
}

function findPropsVariableDeclaration(filePath) {
	const { sourceFile } = analyzeSourceFile(filePath);

	for (const statement of sourceFile.statements) {
		if (!ts.isVariableStatement(statement)) {
			continue;
		}

		for (const declaration of statement.declarationList.declarations) {
			if (
				!ts.isObjectBindingPattern(declaration.name) ||
				!declaration.initializer ||
				!ts.isCallExpression(declaration.initializer) ||
				!ts.isIdentifier(declaration.initializer.expression) ||
				declaration.initializer.expression.text !== '$props'
			) {
				continue;
			}

			return declaration;
		}
	}

	return null;
}

function getPropertyName(nameNode) {
	if (ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode)) {
		return nameNode.text;
	}

	return printNode(nameNode, nameNode.getSourceFile());
}

function collectPropertiesFromMembers(members) {
	return members
		.filter((member) => ts.isPropertySignature(member))
		.map((member) => ({
			name: getPropertyName(member.name),
			optional: Boolean(member.questionToken),
			type: member.type ? printNode(member.type, member.getSourceFile()) : 'unknown',
			source: relativePath(member.getSourceFile().fileName),
			default: null
		}));
}

function collectDefaultsFromObjectBinding(bindingPattern) {
	const defaults = new Map();

	for (const element of bindingPattern.elements) {
		if (element.dotDotDotToken) {
			continue;
		}

		const propertyName = element.propertyName
			? getPropertyName(element.propertyName)
			: ts.isIdentifier(element.name)
				? element.name.text
				: null;

		if (!propertyName || !element.initializer) {
			continue;
		}

		defaults.set(propertyName, printNode(element.initializer, element.getSourceFile()));
	}

	return defaults;
}

function dedupeAndSortProperties(properties) {
	const deduped = new Map();

	for (const property of properties) {
		deduped.set(property.name, property);
	}

	return [...deduped.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function extractStreamdownProps() {
	const checker = getTypeChecker();
	const resolved = resolveTypeDeclaration(streamdownContextFile, 'StreamdownProps');
	if (!resolved) {
		throw new Error('Unable to resolve StreamdownProps in local source');
	}

	const declaration = resolved.declaration;
	const type = ts.isTypeAliasDeclaration(declaration)
		? checker.getTypeFromTypeNode(declaration.type)
		: ts.isInterfaceDeclaration(declaration)
			? checker.getTypeAtLocation(declaration)
			: null;

	if (!type) {
		throw new Error('Resolved StreamdownProps is not a supported declaration kind');
	}

	const defaultsDeclaration = findPropsVariableDeclaration(streamdownComponentFile);
	if (!defaultsDeclaration || !ts.isObjectBindingPattern(defaultsDeclaration.name)) {
		throw new Error('Unable to locate $props() destructuring in Streamdown.svelte');
	}

	const defaults = collectDefaultsFromObjectBinding(defaultsDeclaration.name);
	const fallbackSource = relativePath(resolved.filePath);

	return checker
		.getPropertiesOfType(type)
		.map((symbol) => {
			const declarationNode = symbol.valueDeclaration ?? symbol.declarations?.[0] ?? declaration;
			const symbolType = checker.getTypeOfSymbolAtLocation(symbol, declarationNode);
			const optional = (symbol.flags & ts.SymbolFlags.Optional) !== 0;

			return {
				name: symbol.getName(),
				optional,
				type: normalizePropTypeText(
					checker.typeToString(symbolType, declarationNode, ts.TypeFormatFlags.NoTruncation),
					optional
				),
				source:
					relativePath(declarationNode.getSourceFile().fileName ?? streamdownContextFile) ||
					fallbackSource,
				default: defaults.get(symbol.getName()) ?? null
			};
		})
		.sort((left, right) => left.name.localeCompare(right.name));
}

function extractPluginConfigEntries() {
	const resolved = resolveTypeDeclaration(streamdownPluginsFile, 'PluginConfig');
	if (!resolved) {
		throw new Error('Unable to resolve PluginConfig in local source');
	}

	const declaration = resolved.declaration;
	if (ts.isInterfaceDeclaration(declaration)) {
		return dedupeAndSortProperties(collectPropertiesFromMembers(declaration.members));
	}

	if (ts.isTypeAliasDeclaration(declaration) && ts.isTypeLiteralNode(declaration.type)) {
		return dedupeAndSortProperties(collectPropertiesFromMembers(declaration.type.members));
	}

	throw new Error('Resolved PluginConfig is not a supported declaration kind');
}

function inferSourceEntryFile(exportTarget) {
	if (!exportTarget || typeof exportTarget !== 'object') {
		return null;
	}

	const runtimePath =
		(typeof exportTarget.svelte === 'string' && exportTarget.svelte) ||
		(typeof exportTarget.import === 'string' && exportTarget.import) ||
		null;

	if (!runtimePath || !runtimePath.startsWith('./dist/')) {
		return null;
	}

	const sourceFile = join(repoRoot, runtimePath.replace('./dist/', 'src/lib/'));
	return existsSync(sourceFile) ? sourceFile : null;
}

function extractSubpathProps(filePath) {
	const declaration = findPropsVariableDeclaration(filePath);
	if (!declaration || !declaration.type || !ts.isTypeLiteralNode(declaration.type)) {
		throw new Error(`Unable to resolve $props() type literal in ${relativePath(filePath)}`);
	}

	return dedupeAndSortProperties(collectPropertiesFromMembers(declaration.type.members));
}

function collectSubpathExports(packageJson) {
	return collectPackageExports(packageJson)
		.filter((entry) => entry.subpath !== '.')
		.map((entry) => {
			const entryFile = inferSourceEntryFile(entry.target);
			return {
				subpath: entry.subpath,
				target: entry.target,
				entryFile: entryFile ? relativePath(entryFile) : null,
				props: entryFile ? extractSubpathProps(entryFile) : []
			};
		});
}

function inferWorkspaceEntryFile(packageDir) {
	const candidates = [join(packageDir, 'index.ts'), join(packageDir, 'src', 'index.ts')];
	return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function collectPluginEntryPoints() {
	return listStandalonePluginPackages(repoRoot).map(({ dir, packageJson }) => {
		const entryFile = inferWorkspaceEntryFile(dir);
		if (!entryFile) {
			throw new Error(`Unable to infer entry file for ${packageJson.name}`);
		}

		const packageExports = extractExports(entryFile);
		const runtimeEntries = packageExports
			.filter((entry) => entry.kind === 'value')
			.map((entry) => entry.name)
			.sort((left, right) => left.localeCompare(right));
		const defaultEntry = runtimeEntries.find((entry) => !entry.startsWith('create')) ?? null;
		const createEntry =
			runtimeEntries.find((entry) => entry.startsWith('create') && entry.endsWith('Plugin')) ??
			null;

		return {
			packageName: packageJson.name,
			packageVersion: packageJson.version,
			exports: collectPackageExports(packageJson),
			entryFile: relativePath(entryFile),
			defaultEntry,
			createEntry,
			exportedSymbols: packageExports
		};
	});
}

export function generateLocalApiSurfaceSnapshot() {
	const packageJson = readJson(join(repoRoot, 'package.json'));

	return {
		schemaVersion: 1,
		local: {
			repository: normalizeRepositoryUrl(packageJson.repository?.url ?? null),
			commit: null,
			package: {
				name: packageJson.name,
				version: packageJson.version,
				entryFile: relativePath(entryFile),
				exports: collectPackageExports(packageJson)
			}
		},
		exports: {
			streamdown: extractExports(entryFile),
			plugins: collectPluginEntryPoints()
		},
		streamdownProps: extractStreamdownProps(),
		pluginConfig: extractPluginConfigEntries(),
		subpathExports: collectSubpathExports(packageJson)
	};
}

function stringifySnapshot(snapshot) {
	return `${JSON.stringify(snapshot, null, '\t')}\n`;
}

function verifyLocalSnapshot(expectedContent) {
	const actualContent = stringifySnapshot(generateLocalApiSurfaceSnapshot());
	if (actualContent !== expectedContent) {
		throw new Error(
			[
				'Local API surface snapshot is out of date.',
				`Run: node ${relativePath(scriptFile)} --write`
			].join('\n')
		);
	}
}

function main(argv) {
	const mode = argv[2] ?? '--check';
	const snapshot = generateLocalApiSurfaceSnapshot();
	const content = stringifySnapshot(snapshot);

	if (mode === '--write') {
		mkdirSync(dirname(fixturePath), { recursive: true });
		writeFileSync(fixturePath, content);
		process.stdout.write(`Wrote ${relativePath(fixturePath)}\n`);
		return;
	}

	if (mode === '--check') {
		if (!existsSync(fixturePath)) {
			throw new Error(`Missing snapshot fixture: ${relativePath(fixturePath)}`);
		}

		verifyLocalSnapshot(readFileSync(fixturePath, 'utf8'));
		process.stdout.write(`Verified ${relativePath(fixturePath)}\n`);
		return;
	}

	throw new Error(`Unsupported mode: ${mode}`);
}

const invokedAsEntrypoint = process.argv[1] && resolve(process.argv[1]) === scriptFile;

if (invokedAsEntrypoint) {
	try {
		main(process.argv);
	} catch (error) {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 1;
	}
}
