import { join } from 'node:path';
import {
	assertBuildOutputExists,
	cleanupDirectory,
	createPackDestination,
	createSmokeEntry,
	findTarball,
	parseExportEntries,
	prepareSmokeFixture,
	readJson,
	runCommand,
	runPackSmoke
} from './lib/package-verification.mjs';
import { getPublishablePackages, repoRoot } from './lib/publishable-packages.mjs';

function createPackArgs(pkg, packDestination, packageName) {
	return pkg.dir === repoRoot
		? ['pack', '--pack-destination', packDestination]
		: ['--filter', packageName, 'pack', '--pack-destination', packDestination];
}

function packWorkspacePackage(pkg, packDestination) {
	const packageJson = readJson(join(pkg.dir, 'package.json'));

	runCommand(
		'pnpm',
		createPackArgs(pkg, packDestination, packageJson.name),
		'pnpm pack',
		repoRoot
	);

	return {
		exportEntries: parseExportEntries(packageJson),
		packageJson,
		tarballPath: findTarball(packDestination)
	};
}

function verifyPackage(pkg) {
	const packDestination = createPackDestination(`${pkg.id}-export-verify-`);
	const tempDirectories = [packDestination];
	const fixtureDirectory = join(packDestination, 'pack-smoke');

	try {
		const { exportEntries, packageJson, tarballPath } = packWorkspacePackage(pkg, packDestination);
		assertBuildOutputExists(pkg.dir, exportEntries);

		const tarballPaths = [tarballPath];

		if (pkg.dir === repoRoot) {
			for (const dependencyPkg of getPublishablePackages()) {
				if (dependencyPkg.dir === repoRoot) {
					continue;
				}

				const dependencyDestination = createPackDestination(
					`${dependencyPkg.id}-export-verify-dependency-`
				);
				tempDirectories.push(dependencyDestination);
				tarballPaths.push(packWorkspacePackage(dependencyPkg, dependencyDestination).tarballPath);
			}
		}

		prepareSmokeFixture({
			fixtureTemplateDirectory: pkg.smokeFixtureDir,
			fixtureDirectory,
			tarballPaths,
			entryContent: createSmokeEntry([
				{
					packageName: packageJson.name,
					exportEntries
				}
			])
		});
		runPackSmoke(fixtureDirectory, tarballPaths, repoRoot);

		return {
			package: packageJson.name,
			directory: pkg.dir === repoRoot ? '.' : pkg.dir.replace(`${repoRoot}/`, ''),
			exportsChecked: exportEntries.map((entry) => entry.specifier),
			runtimeImportsSmoked: exportEntries
				.filter((entry) => entry.runtimePaths.length > 0)
				.map((entry) => entry.specifier),
			fixture: 'tests/pack-smoke'
		};
	} finally {
		for (const directory of tempDirectories) {
			cleanupDirectory(directory);
		}
	}
}

const results = getPublishablePackages().map((pkg) => verifyPackage(pkg));
console.log(JSON.stringify({ packages: results }, null, 2));
