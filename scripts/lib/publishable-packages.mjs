import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

const shared = {
	smokeFixtureDir: join(repoRoot, 'tests', 'pack-smoke'),
	requiredRootFiles: ['LICENSE', 'README.md', 'package.json'],
	allowedTopLevelDirectories: ['dist']
};

export function getPublishablePackages() {
	return [
		{
			id: 'svelte-streamdown',
			dir: repoRoot,
			...shared
		},
		{
			id: 'remend',
			dir: join(repoRoot, 'packages', 'remend'),
			...shared
		},
		{
			id: 'streamdown-code',
			dir: join(repoRoot, 'packages', 'streamdown-code'),
			...shared
		},
		{
			id: 'streamdown-math',
			dir: join(repoRoot, 'packages', 'streamdown-math'),
			...shared
		},
		{
			id: 'streamdown-mermaid',
			dir: join(repoRoot, 'packages', 'streamdown-mermaid'),
			...shared
		},
		{
			id: 'streamdown-cjk',
			dir: join(repoRoot, 'packages', 'streamdown-cjk'),
			...shared
		}
	];
}
