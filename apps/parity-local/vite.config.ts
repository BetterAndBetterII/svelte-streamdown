import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appRoot, '../..');

export default defineConfig({
	cacheDir: resolve(appRoot, '.vite'),
	root: appRoot,
	plugins: [tailwindcss(), svelte()],
	assetsInclude: ['**/*.md'],
	resolve: {
		alias: {
			'@streamdown/plugin-core': resolve(repoRoot, 'packages/streamdown-plugin-core/src/index.ts'),
			$lib: resolve(repoRoot, 'src/lib'),
			'svelte-streamdown': resolve(repoRoot, 'src/lib/index.ts')
		}
	}
});
