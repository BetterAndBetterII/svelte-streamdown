import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appRoot, '../..');

export default defineConfig({
	root: appRoot,
	plugins: [svelte()],
	assetsInclude: ['**/*.md'],
	resolve: {
		alias: {
			$lib: resolve(repoRoot, 'src/lib'),
			'svelte-streamdown': resolve(repoRoot, 'src/lib/index.ts')
		}
	}
});
