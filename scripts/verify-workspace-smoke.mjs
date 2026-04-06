import { join } from 'node:path';
import {
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

function createPackArgs(pkg, outputDirectory, packageName) {
	return pkg.dir === repoRoot
		? ['pack', '--pack-destination', outputDirectory]
		: ['--filter', packageName, 'pack', '--pack-destination', outputDirectory];
}

const publishablePackages = getPublishablePackages();
const packDestination = createPackDestination('workspace-smoke-');
const fixtureDirectory = join(packDestination, 'workspace-smoke');

try {
	const packaged = publishablePackages.map((pkg) => {
		const packageJson = readJson(join(pkg.dir, 'package.json'));
		const outputDirectory = join(packDestination, pkg.id);
		runCommand('mkdir', ['-p', outputDirectory], 'mkdir -p', repoRoot);
		runCommand(
			'pnpm',
			createPackArgs(pkg, outputDirectory, packageJson.name),
			'pnpm pack',
			repoRoot
		);

		return {
			packageName: packageJson.name,
			exportEntries: parseExportEntries(packageJson),
			tarballPath: findTarball(outputDirectory)
		};
	});

	prepareSmokeFixture({
		fixtureTemplateDirectory: publishablePackages[0].smokeFixtureDir,
		fixtureDirectory,
		tarballPaths: packaged.map((entry) => entry.tarballPath),
		entryContent: createSmokeEntry(
			packaged.map(({ packageName, exportEntries }) => ({ packageName, exportEntries }))
		)
	});
	runPackSmoke(
		fixtureDirectory,
		packaged.map((entry) => entry.tarballPath),
		repoRoot
	);

	console.log(
		JSON.stringify(
			{
				fixture: 'tests/pack-smoke',
				packages: packaged.map((entry) => entry.packageName)
			},
			null,
			2
		)
	);
} finally {
	cleanupDirectory(packDestination);
}
