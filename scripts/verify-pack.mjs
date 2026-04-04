import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';

const repoRoot = new URL('..', import.meta.url);

const REQUIRED_ROOT_FILES = ['LICENSE', 'README.md', 'package.json'];
const ALLOWED_TOP_LEVEL_DIRECTORIES = new Set(['dist']);
const CODE_EXPORT_PATH_PATTERN = /\.(?:[cm]?js|svelte)$/;
const FORBIDDEN_PACK_ENTRY_PATTERNS = [
	{
		pattern: /(^|\/)(?:tests?|fixtures?|scripts?)(\/|$)/,
		reason: 'test, fixture, or script directory'
	},
	{
		pattern: /(^|\/)[^/]+\.(?:test|spec)\.[^/]+$/,
		reason: 'test or spec file'
	},
	{
		pattern: /^dist\/routes(?:\/|$)/,
		reason: 'SvelteKit route files'
	},
	{
		pattern: /^dist\/app(?:\.|\/|$)/,
		reason: 'SvelteKit app files'
	},
	{
		pattern: /^dist\/demo(?:\.|\/|$)/,
		reason: 'demo application files'
	}
];

function runCommand(command, args, label) {
	const result = spawnSync(command, args, {
		cwd: repoRoot,
		encoding: 'utf8',
		stdio: 'pipe'
	});

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

function createPackDestination() {
	return mkdtempSync(join(tmpdir(), 'svelte-streamdown-pack-verify-'));
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

function listTarballFiles(tarballPath) {
	return runCommand('tar', ['-tzf', tarballPath], 'tar -tzf')
		.split('\n')
		.map((entry) => entry.trim())
		.filter(Boolean)
		.filter((entry) => !entry.endsWith('/'))
		.map((entry) => normalizeTarEntry(entry));
}

function readTarballPackageJson(tarballPath) {
	return JSON.parse(
		runCommand(
			'tar',
			['-xOf', tarballPath, 'package/package.json'],
			'tar -xOf package/package.json'
		)
	);
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
	const exportsMap = packageJson.exports;

	if (!exportsMap || typeof exportsMap !== 'object' || Array.isArray(exportsMap)) {
		throw new Error('package.json exports must be an object');
	}

	return Object.entries(exportsMap).map(([specifier, rawValue]) => {
		const source = `exports[${JSON.stringify(specifier)}]`;
		const allPaths = [...new Set(collectStringLeafPaths(rawValue, source))];
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
			requiresTypes,
			typesPath
		};
	});
}

function assertPackLayout(packFiles) {
	const missingRootFiles = REQUIRED_ROOT_FILES.filter((file) => !packFiles.has(file));

	if (missingRootFiles.length > 0) {
		throw new Error(`Missing required packaged root files: ${missingRootFiles.join(', ')}`);
	}

	for (const file of packFiles) {
		if (REQUIRED_ROOT_FILES.includes(file)) {
			continue;
		}

		const [topLevelDirectory] = file.split('/', 1);

		if (!ALLOWED_TOP_LEVEL_DIRECTORIES.has(topLevelDirectory)) {
			throw new Error(
				`Unexpected packaged file ${file}. Update the explicit package-content policy before shipping new top-level files.`
			);
		}
	}
}

function assertNoForbiddenEntries(packFiles) {
	for (const file of packFiles) {
		for (const { pattern, reason } of FORBIDDEN_PACK_ENTRY_PATTERNS) {
			if (pattern.test(file)) {
				throw new Error(`Forbidden packaged file ${file} (${reason})`);
			}
		}
	}
}

function assertPackContainsPath(packFiles, packagePath, source) {
	if (!packFiles.has(packagePath)) {
		throw new Error(
			`${source} points to ${packagePath}, but that file is missing from the tarball`
		);
	}
}

function assertMetadataPath(packFiles, packageJson, fieldName) {
	const value = packageJson[fieldName];

	if (typeof value !== 'string') {
		return;
	}

	const packagePath = normalizePackagePath(value, `package.json ${fieldName}`);
	assertPackContainsPath(packFiles, packagePath, `package.json ${fieldName}`);
}

function assertExports(packFiles, packageJson) {
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

function main() {
	const packDestination = createPackDestination();

	try {
		runCommand('pnpm', ['pack', '--pack-destination', packDestination], 'pnpm pack');

		const tarballPath = findTarball(packDestination);
		const packFiles = new Set(listTarballFiles(tarballPath));
		const tarballPackageJson = readTarballPackageJson(tarballPath);
		const exportEntries = assertExports(packFiles, tarballPackageJson);

		assertPackLayout(packFiles);
		assertNoForbiddenEntries(packFiles);
		assertMetadataPath(packFiles, tarballPackageJson, 'types');
		assertMetadataPath(packFiles, tarballPackageJson, 'svelte');
		assertMetadataPath(packFiles, tarballPackageJson, 'main');
		assertMetadataPath(packFiles, tarballPackageJson, 'module');

		console.log(
			JSON.stringify(
				{
					tarball: tarballPath.split('/').pop(),
					fileCount: packFiles.size,
					exportsChecked: exportEntries.map((entry) => entry.specifier),
					requiredRootFiles: REQUIRED_ROOT_FILES
				},
				null,
				2
			)
		);
	} finally {
		rmSync(packDestination, {
			force: true,
			recursive: true
		});
	}
}

main();
