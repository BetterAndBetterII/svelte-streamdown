import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const scriptFile = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(scriptFile), '..');
const referenceRoot = join(repoRoot, 'references', 'streamdown');
const referencePackagesRoot = join(referenceRoot, 'packages');
const referencePackageDir = join(referencePackagesRoot, 'streamdown');
const referenceEntryFile = join(referencePackageDir, 'index.tsx');
const fixturePath = join(repoRoot, 'fixtures', 'parity', 'reference-api-surface.json');

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const sourceFileCache = new Map();
const analysisCache = new Map();

function readJson(filePath) {
	return JSON.parse(readFileSync(filePath, 'utf8'));
}

function readSourceFile(filePath) {
	if (!sourceFileCache.has(filePath)) {
		const sourceText = readFileSync(filePath, 'utf8');
		sourceFileCache.set(
			filePath,
			ts.createSourceFile(
				filePath,
				sourceText,
				ts.ScriptTarget.Latest,
				true,
				filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
			)
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

function git(commandArgs, cwd) {
	return execFileSync('git', ['-C', cwd, ...commandArgs], {
		cwd: repoRoot,
		encoding: 'utf8'
	}).trim();
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

function printNode(node, sourceFile) {
	return normalizeText(printer.printNode(ts.EmitHint.Unspecified, node, sourceFile));
}

function resolveModuleToFile(baseFilePath, moduleSpecifier) {
	if (!moduleSpecifier.startsWith('.')) {
		return null;
	}

	const basePath = resolve(dirname(baseFilePath), moduleSpecifier);
	const candidates = [
		basePath,
		`${basePath}.ts`,
		`${basePath}.tsx`,
		`${basePath}.mts`,
		`${basePath}.cts`,
		join(basePath, 'index.ts'),
		join(basePath, 'index.tsx')
	];

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

		if (ts.isTypeAliasDeclaration(statement)) {
			exports.push({
				name: statement.name.text,
				kind: 'type',
				source: null,
				importedName: statement.name.text
			});
			continue;
		}

		if (ts.isInterfaceDeclaration(statement)) {
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

function resolveLocalDeclaration(filePath, typeName) {
	const { localDeclarations, imports } = analyzeSourceFile(filePath);
	if (localDeclarations.has(typeName)) {
		return { filePath, declaration: localDeclarations.get(typeName) };
	}

	const imported = imports.get(typeName);
	if (!imported?.resolvedFilePath) {
		return null;
	}

	return resolveLocalDeclaration(imported.resolvedFilePath, imported.importedName);
}

function getPropertyName(nameNode) {
	if (ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode)) {
		return nameNode.text;
	}

	return printNode(nameNode, nameNode.getSourceFile());
}

function collectPropertiesFromTypeNode(filePath, typeNode, lineage = new Set()) {
	if (!typeNode) {
		return [];
	}

	if (ts.isParenthesizedTypeNode(typeNode)) {
		return collectPropertiesFromTypeNode(filePath, typeNode.type, lineage);
	}

	if (ts.isIntersectionTypeNode(typeNode)) {
		return typeNode.types.flatMap((memberType) =>
			collectPropertiesFromTypeNode(filePath, memberType, lineage)
		);
	}

	if (ts.isTypeLiteralNode(typeNode)) {
		return typeNode.members
			.filter((member) => ts.isPropertySignature(member))
			.map((member) => ({
				name: getPropertyName(member.name),
				optional: Boolean(member.questionToken),
				type: member.type ? printNode(member.type, member.getSourceFile()) : 'unknown',
				source: relativePath(member.getSourceFile().fileName)
			}));
	}

	if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
		const resolved = resolveLocalDeclaration(filePath, typeNode.typeName.text);
		if (!resolved) {
			return [];
		}

		const lineageKey = `${resolved.filePath}:${typeNode.typeName.text}`;
		if (lineage.has(lineageKey)) {
			return [];
		}

		const nextLineage = new Set(lineage);
		nextLineage.add(lineageKey);
		return collectPropertiesFromDeclaration(resolved.filePath, resolved.declaration, nextLineage);
	}

	return [];
}

function collectPropertiesFromDeclaration(filePath, declaration, lineage = new Set()) {
	if (ts.isInterfaceDeclaration(declaration)) {
		const inherited =
			declaration.heritageClauses
				?.filter((heritageClause) => heritageClause.token === ts.SyntaxKind.ExtendsKeyword)
				.flatMap((heritageClause) =>
					heritageClause.types.flatMap((heritageType) =>
						collectPropertiesFromTypeNode(filePath, heritageType, lineage)
					)
				) ?? [];

		const own = declaration.members
			.filter((member) => ts.isPropertySignature(member))
			.map((member) => ({
				name: getPropertyName(member.name),
				optional: Boolean(member.questionToken),
				type: member.type ? printNode(member.type, member.getSourceFile()) : 'unknown',
				source: relativePath(member.getSourceFile().fileName)
			}));

		return [...inherited, ...own];
	}

	if (ts.isTypeAliasDeclaration(declaration)) {
		return collectPropertiesFromTypeNode(filePath, declaration.type, lineage);
	}

	return [];
}

function dedupeAndSortProperties(properties) {
	const deduped = new Map();

	for (const property of properties) {
		deduped.set(property.name, property);
	}

	return [...deduped.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function findExportedVariableDeclaration(filePath, exportName) {
	const { sourceFile } = analyzeSourceFile(filePath);
	for (const statement of sourceFile.statements) {
		if (!ts.isVariableStatement(statement) || !getExportModifier(statement)) {
			continue;
		}

		for (const declaration of statement.declarationList.declarations) {
			if (ts.isIdentifier(declaration.name) && declaration.name.text === exportName) {
				return declaration;
			}
		}
	}

	return null;
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

function extractStreamdownDefaults() {
	const streamdownDeclaration = findExportedVariableDeclaration(referenceEntryFile, 'Streamdown');
	if (!streamdownDeclaration || !streamdownDeclaration.initializer) {
		throw new Error('Unable to locate exported Streamdown declaration in reference entry file');
	}

	if (!ts.isCallExpression(streamdownDeclaration.initializer)) {
		throw new Error('Expected Streamdown export to be wrapped in a call expression');
	}

	const renderFunction = streamdownDeclaration.initializer.arguments[0];
	if (!(ts.isArrowFunction(renderFunction) || ts.isFunctionExpression(renderFunction))) {
		throw new Error('Expected Streamdown memo call to receive a render function');
	}

	const propsParameter = renderFunction.parameters[0];
	if (!propsParameter || !ts.isObjectBindingPattern(propsParameter.name)) {
		throw new Error('Expected Streamdown render function to destructure props');
	}

	return collectDefaultsFromObjectBinding(propsParameter.name);
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

function collectPackageExports(packageJson) {
	return Object.entries(packageJson.exports)
		.map(([subpath, target]) => ({
			subpath,
			target
		}))
		.sort((left, right) => left.subpath.localeCompare(right.subpath));
}

function collectPluginEntryPoints() {
	const pluginPackageDirs = [
		'streamdown-code',
		'streamdown-mermaid',
		'streamdown-math',
		'streamdown-cjk'
	];
	return pluginPackageDirs.map((directoryName) => {
		const packageDir = join(referencePackagesRoot, directoryName);
		const packageJson = readJson(join(packageDir, 'package.json'));
		const entryFile = join(packageDir, 'index.ts');
		const packageExports = extractExports(entryFile);
		const runtimeEntries = packageExports
			.filter((entry) => entry.kind === 'value' && !entry.source)
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

function buildPluginConfigEntries() {
	const resolved = resolveLocalDeclaration(referenceEntryFile, 'PluginConfig');
	if (!resolved) {
		throw new Error('Unable to resolve PluginConfig in reference source');
	}

	const packageByPluginKey = {
		cjk: '@streamdown/cjk',
		code: '@streamdown/code',
		math: '@streamdown/math',
		mermaid: '@streamdown/mermaid'
	};

	return dedupeAndSortProperties(
		collectPropertiesFromDeclaration(resolved.filePath, resolved.declaration)
	).map((property) => ({
		...property,
		packageName: packageByPluginKey[property.name] ?? null
	}));
}

export function generateReferenceApiSurfaceSnapshot() {
	if (!existsSync(referencePackageDir)) {
		throw new Error(`Missing reference package directory: ${referencePackageDir}`);
	}

	const packageJson = readJson(join(referencePackageDir, 'package.json'));
	const resolvedStreamdownProps = resolveLocalDeclaration(referenceEntryFile, 'StreamdownProps');
	if (!resolvedStreamdownProps) {
		throw new Error('Unable to resolve StreamdownProps in reference entry file');
	}

	const streamdownDefaults = extractStreamdownDefaults();
	const streamdownProps = dedupeAndSortProperties(
		collectPropertiesFromDeclaration(
			resolvedStreamdownProps.filePath,
			resolvedStreamdownProps.declaration
		)
	).map((property) => ({
		...property,
		default: streamdownDefaults.get(property.name) ?? null
	}));

	return {
		schemaVersion: 1,
		reference: {
			repository: 'https://github.com/vercel/streamdown.git',
			commit: git(['rev-parse', 'HEAD'], referenceRoot),
			package: {
				name: packageJson.name,
				version: packageJson.version,
				entryFile: relativePath(referenceEntryFile),
				exports: collectPackageExports(packageJson)
			}
		},
		exports: {
			streamdown: extractExports(referenceEntryFile),
			plugins: collectPluginEntryPoints()
		},
		streamdownProps,
		pluginConfig: buildPluginConfigEntries()
	};
}

function stringifySnapshot(snapshot) {
	return `${JSON.stringify(snapshot, null, '\t')}\n`;
}

function verifyReferenceSnapshot(expectedContent) {
	const actualContent = stringifySnapshot(generateReferenceApiSurfaceSnapshot());
	if (actualContent !== expectedContent) {
		throw new Error(
			[
				'Reference API surface snapshot is out of date.',
				`Run: node ${relativePath(scriptFile)} --write`
			].join('\n')
		);
	}
}

function main(argv) {
	const mode = argv[2] ?? '--check';
	const snapshot = generateReferenceApiSurfaceSnapshot();
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

		verifyReferenceSnapshot(readFileSync(fixturePath, 'utf8'));
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
