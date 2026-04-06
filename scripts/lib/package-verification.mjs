import {
	cpSync,
	copyFileSync,
	existsSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, join, posix } from 'node:path';

const CODE_EXPORT_PATH_PATTERN = /\.(?:[cm]?js|svelte)$/;
const CSS_EXPORT_PATTERN = /\.css$/;

export function runCommand(command, args, label, cwd) {
	const result = spawnSync(command, args, {
		cwd,
		encoding: 'utf8',
		maxBuffer: 10 * 1024 * 1024,
		stdio: 'pipe'
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

export function readJson(path) {
	return JSON.parse(readFileSync(path, 'utf8'));
}

export function normalizePackagePath(rawPath, source) {
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

export function collectStringLeafPaths(rawValue, source) {
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

export function parseExportEntries(packageJson) {
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
		const typesPath =
			typeof rawValue === 'string'
				? rawValue.endsWith('.d.ts')
					? normalizePackagePath(rawValue, source)
					: null
				: typeof rawValue.types === 'string'
					? normalizePackagePath(rawValue.types, `${source}.types`)
					: null;
		const requiresTypes = allPaths.some((path) => CODE_EXPORT_PATH_PATTERN.test(path));

		return {
			specifier,
			allPaths,
			runtimePaths,
			requiresTypes,
			typesPath
		};
	});
}

export function createPackDestination(prefix) {
	return mkdtempSync(join(tmpdir(), prefix));
}

export function findTarball(packDestination) {
	const tarballs = readdirSync(packDestination).filter((entry) => entry.endsWith('.tgz'));

	if (tarballs.length !== 1) {
		throw new Error(
			`Expected exactly one tarball from pnpm pack, found ${tarballs.length}: ${tarballs.join(', ')}`
		);
	}

	return join(packDestination, tarballs[0]);
}

function normalizeTarEntry(entry) {
	const normalizedEntry = entry.trim();

	if (!normalizedEntry) {
		throw new Error('Encountered an empty tar entry');
	}

	if (!normalizedEntry.startsWith('package/')) {
		throw new Error(`Unexpected tar entry outside package/ root: ${normalizedEntry}`);
	}

	const normalizedPath = posix.normalize(normalizedEntry.slice('package/'.length));

	if (!normalizedPath || normalizedPath === '.' || normalizedPath.startsWith('../')) {
		throw new Error(`Invalid packaged path: ${normalizedEntry}`);
	}

	return normalizedPath;
}

export function listTarballFiles(tarballPath, cwd) {
	return runCommand('tar', ['-tzf', tarballPath], 'tar -tzf', cwd)
		.split('\n')
		.map((entry) => entry.trim())
		.filter(Boolean)
		.filter((entry) => !entry.endsWith('/'))
		.map((entry) => normalizeTarEntry(entry));
}

export function readTarballPackageJson(tarballPath, cwd) {
	return JSON.parse(
		runCommand(
			'tar',
			['-xOf', tarballPath, 'package/package.json'],
			'tar -xOf package/package.json',
			cwd
		)
	);
}

export function assertPackContainsPath(packFiles, packagePath, source) {
	if (!packFiles.has(packagePath)) {
		throw new Error(`${source} points to ${packagePath}, but that file is missing from the tarball`);
	}
}

export function assertMetadataPath(packFiles, packageJson, fieldName) {
	const value = packageJson[fieldName];

	if (typeof value !== 'string') {
		return;
	}

	const packagePath = normalizePackagePath(value, `package.json ${fieldName}`);
	assertPackContainsPath(packFiles, packagePath, `package.json ${fieldName}`);
}

export function assertExports(packFiles, packageJson) {
	const exportEntries = parseExportEntries(packageJson);

	for (const entry of exportEntries) {
		for (const packagePath of entry.allPaths) {
			assertPackContainsPath(packFiles, packagePath, `export ${entry.specifier}`);
		}

		if (entry.requiresTypes && !entry.typesPath) {
			throw new Error(`Export ${entry.specifier} is missing a types declaration path`);
		}

		if (entry.typesPath) {
			assertPackContainsPath(packFiles, entry.typesPath, `export ${entry.specifier} types`);
		}
	}

	return exportEntries;
}

export function assertBuildOutputExists(packageDir, exportEntries) {
	for (const entry of exportEntries) {
		for (const packagePath of entry.allPaths) {
			const absolutePath = join(packageDir, packagePath);

			if (!existsSync(absolutePath)) {
				throw new Error(
					`Export ${entry.specifier} points to ${packagePath}, but that file is missing after build`
				);
			}
		}
	}
}

export function createPackageImportSpecifier(packageName, exportSpecifier) {
	return exportSpecifier === '.'
		? packageName
		: `${packageName}/${exportSpecifier.replace(/^\.\//, '')}`;
}

export function createSmokeEntry(packages) {
	const importLines = [];
	const checkLines = ['const resolvedSpecifiers = [];'];
	let bindingIndex = 0;

	for (const { packageName, exportEntries } of packages) {
		for (const entry of exportEntries) {
			if (entry.runtimePaths.length === 0) {
				continue;
			}

			const importSpecifier = createPackageImportSpecifier(packageName, entry.specifier);
			const resolvedLabel = `${packageName}:${entry.specifier}`;

			if (entry.runtimePaths.every((path) => CSS_EXPORT_PATTERN.test(path))) {
				importLines.push(`import ${JSON.stringify(importSpecifier)};`);
				checkLines.push(`resolvedSpecifiers.push(${JSON.stringify(resolvedLabel)});`);
				continue;
			}

			const bindingName = `exportModule${bindingIndex++}`;
			importLines.push(`import * as ${bindingName} from ${JSON.stringify(importSpecifier)};`);
			checkLines.push(
				`if (${bindingName} == null || (typeof ${bindingName} === 'object' && Object.keys(${bindingName}).length === 0)) {`,
				`  throw new Error(${JSON.stringify(`Export ${resolvedLabel} resolved to an empty module`)});`,
				'}',
				`resolvedSpecifiers.push(${JSON.stringify(resolvedLabel)});`
			);
		}
	}

	return `${importLines.join('\n')}\n\n${checkLines.join('\n')}\n\nexport default resolvedSpecifiers;\n`;
}

export function prepareSmokeFixture({ fixtureTemplateDirectory, fixtureDirectory, tarballPaths, entryContent }) {
	cpSync(fixtureTemplateDirectory, fixtureDirectory, {
		recursive: true
	});

	for (const tarballPath of tarballPaths) {
		copyFileSync(tarballPath, join(fixtureDirectory, basename(tarballPath)));
	}

	writeFileSync(join(fixtureDirectory, 'src', 'export-smoke.js'), entryContent);
}

export function runPackSmoke(fixtureDirectory, tarballPaths, cwd) {
	runCommand(
		'pnpm',
		['install', '--prefer-offline', '--no-frozen-lockfile'],
		'pack smoke install',
		fixtureDirectory
	);
	runCommand(
		'pnpm',
		['add', '--prefer-offline', ...tarballPaths.map((tarballPath) => `./${basename(tarballPath)}`)],
		'pack smoke tarball install',
		fixtureDirectory
	);
	runCommand('pnpm', ['build'], 'pack smoke build', fixtureDirectory);
	runCommand(
		'node',
		[join('dist-ssr', 'export-smoke.js')],
		'pack smoke execute built bundle',
		fixtureDirectory
	);
}

export function cleanupDirectory(path) {
	rmSync(path, {
		force: true,
		recursive: true
	});
}
