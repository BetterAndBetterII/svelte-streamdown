import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parse as parseSvelte } from 'svelte/compiler';
import ts from 'typescript';

const scriptFile = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(scriptFile), '..');
const entryFile = join(repoRoot, 'src', 'lib', 'index.ts');
const streamdownComponentFile = join(repoRoot, 'src', 'lib', 'Streamdown.svelte');
const streamdownContextFile = join(repoRoot, 'src', 'lib', 'context.svelte.ts');
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

function collectPropertiesFromTypeLiteral(typeLiteralNode) {
	return typeLiteralNode.members
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
	const declaration = findTypeAliasDeclaration(streamdownContextFile, 'StreamdownProps');
	if (!declaration || !ts.isTypeAliasDeclaration(declaration)) {
		throw new Error('Unable to resolve StreamdownProps in local source');
	}

	const type = checker.getTypeFromTypeNode(declaration.type);
	const defaultsDeclaration = findPropsVariableDeclaration(streamdownComponentFile);
	if (!defaultsDeclaration || !ts.isObjectBindingPattern(defaultsDeclaration.name)) {
		throw new Error('Unable to locate $props() destructuring in Streamdown.svelte');
	}

	const defaults = collectDefaultsFromObjectBinding(defaultsDeclaration.name);
	const fallbackSource = relativePath(streamdownContextFile);

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

	return dedupeAndSortProperties(collectPropertiesFromTypeLiteral(declaration.type));
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

export function generateLocalApiSurfaceSnapshot() {
	const packageJson = readJson(join(repoRoot, 'package.json'));

	return {
		schemaVersion: 1,
		local: {
			repository: packageJson.repository?.url ?? null,
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
			plugins: []
		},
		streamdownProps: extractStreamdownProps(),
		pluginConfig: [],
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
