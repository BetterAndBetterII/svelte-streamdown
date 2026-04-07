import { existsSync, readdirSync, readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appRoot, '../..');
const referencePackagesRoot = resolve(repoRoot, 'references/streamdown/packages');

function readJson(filePath: string) {
	return JSON.parse(readFileSync(filePath, 'utf8'));
}

function listReferencePackages() {
	return readdirSync(referencePackagesRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => {
			const packageDir = join(referencePackagesRoot, entry.name);
			return {
				dir: packageDir,
				packageJson: readJson(join(packageDir, 'package.json'))
			};
		});
}

function getRootExportTarget(exportsField: unknown) {
	if (!exportsField || typeof exportsField !== 'object' || Array.isArray(exportsField)) {
		return null;
	}

	const rootExport = (exportsField as Record<string, unknown>)['.'];
	if (typeof rootExport === 'string') {
		return rootExport;
	}

	if (!rootExport || typeof rootExport !== 'object' || Array.isArray(rootExport)) {
		return null;
	}

	for (const key of ['source', 'svelte', 'development', 'import', 'default']) {
		const candidate = (rootExport as Record<string, unknown>)[key];
		if (typeof candidate === 'string') {
			return candidate;
		}
	}

	return null;
}

function findFirstExistingPath(packageDir: string, candidates: string[]) {
	for (const candidate of candidates) {
		const resolvedCandidate = join(packageDir, candidate);
		if (existsSync(resolvedCandidate)) {
			return resolvedCandidate;
		}
	}

	return null;
}

function resolveReferenceSourceEntry(packageName: string) {
	const pkg = listReferencePackages().find((entry) => entry.packageJson.name === packageName);
	if (!pkg) {
		throw new Error(`Unable to locate cloned reference package ${packageName}`);
	}

	const exportTarget = getRootExportTarget(pkg.packageJson.exports);
	const candidates = new Set<string>();

	if (typeof exportTarget === 'string') {
		const normalizedTarget = exportTarget.replace(/^\.\//, '');
		candidates.add(normalizedTarget);

		if (normalizedTarget.startsWith('dist/')) {
			const sourceBase = normalizedTarget.replace(/^dist\//, 'src/').replace(/\.js$/, '');
			candidates.add(`${sourceBase}.ts`);
			candidates.add(`${sourceBase}.tsx`);
		}
	}

	for (const fallback of ['src/index.ts', 'src/index.tsx', 'index.ts', 'index.tsx']) {
		candidates.add(fallback);
	}

	const sourceEntry = findFirstExistingPath(pkg.dir, [...candidates]);
	if (!sourceEntry) {
		throw new Error(`Unable to resolve a source entry for cloned reference package ${packageName}`);
	}

	return sourceEntry;
}

const referenceAlias = Object.fromEntries(
	['streamdown', '@streamdown/cjk', '@streamdown/code', '@streamdown/math', '@streamdown/mermaid', 'remend'].map(
		(packageName) => [packageName, resolveReferenceSourceEntry(packageName)]
	)
);

export default defineConfig({
	cacheDir: resolve(appRoot, '.vite'),
	root: appRoot,
	plugins: [tailwindcss(), react()],
	assetsInclude: ['**/*.md'],
	resolve: {
		alias: referenceAlias
	}
});
