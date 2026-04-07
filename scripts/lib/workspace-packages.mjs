import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function readJson(filePath) {
	return JSON.parse(readFileSync(filePath, 'utf8'));
}

function createWorkspacePackageEntry(packageDir, relativeDir, packageJson) {
	return {
		dir: packageDir,
		relativeDir,
		packageJson,
		packageJsonPath: join(packageDir, 'package.json')
	};
}

export function listWorkspacePackages(repoRoot, { includeRoot = false } = {}) {
	const packages = [];

	if (includeRoot) {
		packages.push(
			createWorkspacePackageEntry(repoRoot, '.', readJson(join(repoRoot, 'package.json')))
		);
	}

	const packagesRoot = join(repoRoot, 'packages');
	if (!existsSync(packagesRoot)) {
		return packages;
	}

	for (const entry of readdirSync(packagesRoot, { withFileTypes: true })) {
		if (!entry.isDirectory()) {
			continue;
		}

		const packageDir = join(packagesRoot, entry.name);
		const packageJsonPath = join(packageDir, 'package.json');
		if (!existsSync(packageJsonPath)) {
			continue;
		}

		packages.push(
			createWorkspacePackageEntry(
				packageDir,
				join('packages', entry.name),
				readJson(packageJsonPath)
			)
		);
	}

	return packages.sort((left, right) => left.relativeDir.localeCompare(right.relativeDir));
}

export function listStandalonePluginPackages(repoRoot) {
	const nonPluginPackageDirs = new Set(['remend', 'streamdown', 'streamdown-plugin-core']);

	return listWorkspacePackages(repoRoot).filter(
		(entry) => !nonPluginPackageDirs.has(entry.relativeDir.replace(/^packages\//, ''))
	);
}
