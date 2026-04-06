import { relative } from 'node:path';
import {
	assertExports,
	assertMetadataPath,
	cleanupDirectory,
	createPackDestination,
	findTarball,
	listTarballFiles,
	readTarballPackageJson,
	runCommand
} from './lib/package-verification.mjs';
import { getPublishablePackages, repoRoot } from './lib/publishable-packages.mjs';

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

function createPackArgs(pkg, packDestination, packageName) {
	return pkg.dir === repoRoot
		? ['pack', '--pack-destination', packDestination]
		: ['--filter', packageName, 'pack', '--pack-destination', packDestination];
}

function assertPackLayout(packFiles, pkg) {
	const missingRootFiles = pkg.requiredRootFiles.filter((file) => !packFiles.has(file));

	if (missingRootFiles.length > 0) {
		throw new Error(`Missing required packaged root files: ${missingRootFiles.join(', ')}`);
	}

	const allowedTopLevelDirectories = new Set(pkg.allowedTopLevelDirectories);

	for (const file of packFiles) {
		if (pkg.requiredRootFiles.includes(file)) {
			continue;
		}

		const [topLevelDirectory] = file.split('/', 1);

		if (!allowedTopLevelDirectories.has(topLevelDirectory)) {
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

function verifyPackage(pkg) {
	const packDestination = createPackDestination(`${pkg.id}-pack-verify-`);
	const packageJsonPath = `${pkg.dir}/package.json`;

	try {
		const packageJson = JSON.parse(runCommand('cat', [packageJsonPath], 'cat package.json', repoRoot));
		runCommand(
			'pnpm',
			createPackArgs(pkg, packDestination, packageJson.name),
			'pnpm pack',
			repoRoot
		);

		const tarballPath = findTarball(packDestination);
		const packFiles = new Set(listTarballFiles(tarballPath, repoRoot));
		const tarballPackageJson = readTarballPackageJson(tarballPath, repoRoot);
		const exportEntries = assertExports(packFiles, tarballPackageJson);

		assertPackLayout(packFiles, pkg);
		assertNoForbiddenEntries(packFiles);
		assertMetadataPath(packFiles, tarballPackageJson, 'types');
		assertMetadataPath(packFiles, tarballPackageJson, 'svelte');
		assertMetadataPath(packFiles, tarballPackageJson, 'main');
		assertMetadataPath(packFiles, tarballPackageJson, 'module');

		return {
			package: tarballPackageJson.name,
			directory: relative(repoRoot, pkg.dir) || '.',
			tarball: tarballPath,
			exportsChecked: exportEntries.map((entry) => entry.specifier)
		};
	} finally {
		cleanupDirectory(packDestination);
	}
}

const results = getPublishablePackages().map((pkg) => verifyPackage(pkg));
console.log(JSON.stringify({ packages: results }, null, 2));
