import {
	cpSync,
	copyFileSync,
	existsSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listWorkspacePackages } from './lib/workspace-packages.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const fixtureTemplateDirectory = join(repoRoot, 'tests', 'pack-smoke');
const generatedSmokeEntryRelativePath = join('src', 'export-smoke.js');
const cssExportPattern = /\.css$/;

function runCommand(command, args, label, cwd = repoRoot) {
	const result = spawnSync(command, args, {
		cwd,
		encoding: 'utf8',
		stdio: 'pipe',
		maxBuffer: 10 * 1024 * 1024
	});

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		const stderr = result.stderr.trim();
		const stdout = result.stdout.trim();
		throw new Error(
			[`${label} failed`, stderr, stdout].filter(Boolean).join('\n') ||
				`Failed to run ${command} ${args.join(' ')}`
		);
	}

	return result.stdout.trim();
}

function readJson(path) {
	return JSON.parse(readFileSync(path, 'utf8'));
}

function normalizePackagePath(rawPath, source) {
	if (typeof rawPath !== 'string') {
		throw new Error(`${source} must be a relative package path string`);
	}

	const value = rawPath.trim();

	if (!value.startsWith('./')) {
		throw new Error(`${source} must start with "./", received: ${value}`);
	}

	const normalizedPath = posix.normalize(value.slice(2));

	if (!normalizedPath || normalizedPath === '.' || normalizedPath.startsWith('../')) {
		throw new Error(`${source} must resolve inside the package, received: ${value}`);
	}

	return normalizedPath;
}

function collectStringLeafPaths(rawValue, source) {
	if (typeof rawValue === 'string') {
		return [normalizePackagePath(rawValue, source)];
	}

	if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
		throw new Error(`${source} must be a string or nested condition object`);
	}

	return Object.entries(rawValue).flatMap(([key, value]) =>
		collectStringLeafPaths(value, `${source}.${key}`)
	);
}

function parseExportEntries(packageJson) {
	if (!packageJson || typeof packageJson !== 'object' || Array.isArray(packageJson)) {
		throw new Error('package.json must be an object');
	}

	if (typeof packageJson.name !== 'string' || !packageJson.name.trim()) {
		throw new Error('package.json name must be a non-empty string');
	}

	if (
		!packageJson.exports ||
		typeof packageJson.exports !== 'object' ||
		Array.isArray(packageJson.exports)
	) {
		throw new Error('package.json exports must be an object');
	}

	return Object.entries(packageJson.exports).map(([specifier, rawValue]) => {
		const source = `exports[${JSON.stringify(specifier)}]`;
		const allPaths = [...new Set(collectStringLeafPaths(rawValue, source))];
		const runtimePaths = allPaths.filter((path) => !path.endsWith('.d.ts'));

		return {
			specifier,
			allPaths,
			runtimePaths
		};
	});
}

function assertBuildOutputExists(packageRoot, exportEntries) {
	for (const entry of exportEntries) {
		for (const packagePath of entry.allPaths) {
			const absolutePath = join(packageRoot, packagePath);

			if (!existsSync(absolutePath)) {
				throw new Error(
					`Export ${entry.specifier} points to ${packagePath}, but that file is missing after build`
				);
			}
		}
	}
}

function createPackDestination() {
	return mkdtempSync(join(tmpdir(), 'svelte-streamdown-export-verify-'));
}

function findTarball(packDestination) {
	const tarballs = readdirSync(packDestination).filter((entry) => entry.endsWith('.tgz'));

	if (tarballs.length !== 1) {
		throw new Error(
			`Expected exactly one tarball from pnpm pack, found ${tarballs.length}: ${tarballs.join(', ')}`
		);
	}

	return join(packDestination, tarballs[0]);
}

function createPackageImportSpecifier(packageName, exportSpecifier) {
	return exportSpecifier === '.'
		? packageName
		: `${packageName}/${exportSpecifier.replace(/^\.\//, '')}`;
}

function createSmokeEntry(packageName, exportEntries) {
	const importLines = [];
	const checkLines = ['const resolvedSpecifiers = [];'];
	let bindingIndex = 0;

	for (const entry of exportEntries) {
		if (entry.runtimePaths.length === 0) {
			continue;
		}

		const importSpecifier = createPackageImportSpecifier(packageName, entry.specifier);

		if (entry.runtimePaths.every((path) => cssExportPattern.test(path))) {
			importLines.push(`import ${JSON.stringify(importSpecifier)};`);
			checkLines.push(`resolvedSpecifiers.push(${JSON.stringify(entry.specifier)});`);
			continue;
		}

		const bindingName = `exportModule${bindingIndex++}`;
		importLines.push(`import * as ${bindingName} from ${JSON.stringify(importSpecifier)};`);
		checkLines.push(
			`if (${bindingName} == null || (typeof ${bindingName} === 'object' && Object.keys(${bindingName}).length === 0)) {`,
			`  throw new Error(${JSON.stringify(`Export ${entry.specifier} resolved to an empty module`)});`,
			'}',
			`resolvedSpecifiers.push(${JSON.stringify(entry.specifier)});`
		);
	}

	return `${importLines.join('\n')}\n\n${checkLines.join('\n')}\n\nexport default resolvedSpecifiers;\n`;
}

function prepareFixture(fixtureDirectory, tarballPath, packageName, exportEntries) {
	cpSync(fixtureTemplateDirectory, fixtureDirectory, {
		recursive: true
	});

	copyFileSync(tarballPath, join(fixtureDirectory, basename(tarballPath)));
	writeFileSync(
		join(fixtureDirectory, generatedSmokeEntryRelativePath),
		createSmokeEntry(packageName, exportEntries)
	);
}

function runPackSmoke(fixtureDirectory, tarballPath) {
	runCommand(
		'pnpm',
		['install', '--prefer-offline', '--no-frozen-lockfile'],
		'pack smoke install',
		fixtureDirectory
	);
	runCommand(
		'pnpm',
		['add', '--prefer-offline', `./${basename(tarballPath)}`],
		'pack smoke tarball install',
		fixtureDirectory
	);
	runCommand('pnpm', ['build'], 'pack smoke build', fixtureDirectory);
	runCommand(
		'node',
		[join('dist-ssr', posix.basename(generatedSmokeEntryRelativePath))],
		'pack smoke execute built bundle',
		fixtureDirectory
	);
}

function verifyPackageExports(workspacePackage) {
	const packDestination = createPackDestination();
	const fixtureDirectory = join(packDestination, 'pack-smoke');
	const { dir: packageRoot, packageJson, relativeDir } = workspacePackage;
	const exportEntries = parseExportEntries(packageJson);
	const packArgs =
		relativeDir === '.'
			? ['pack', '--pack-destination', packDestination]
			: ['--filter', packageJson.name, 'pack', '--pack-destination', packDestination];

	try {
		runCommand('pnpm', packArgs, 'pnpm pack', repoRoot);
		assertBuildOutputExists(packageRoot, exportEntries);

		const tarballPath = findTarball(packDestination);
		prepareFixture(fixtureDirectory, tarballPath, packageJson.name, exportEntries);
		runPackSmoke(fixtureDirectory, tarballPath);

		return {
			name: packageJson.name,
			path: relativeDir,
			tarball: basename(tarballPath),
			exportsChecked: exportEntries.map((entry) => entry.specifier),
			runtimeImportsSmoked: exportEntries
				.filter((entry) => entry.runtimePaths.length > 0)
				.map((entry) => entry.specifier)
		};
	} finally {
		rmSync(packDestination, {
			force: true,
			recursive: true
		});
	}
}

function main() {
	if (!existsSync(fixtureTemplateDirectory)) {
		throw new Error(`Missing pack smoke fixture template at ${fixtureTemplateDirectory}`);
	}

	const workspacePackages = [
		{
			dir: repoRoot,
			relativeDir: '.',
			packageJson: readJson(join(repoRoot, 'package.json'))
		},
		...listWorkspacePackages(repoRoot)
	];
	const results = workspacePackages.map(verifyPackageExports);

	console.log(
		JSON.stringify(
			{
				fixture: 'tests/pack-smoke',
				packages: results
			},
			null,
			2
		)
	);
}

main();
