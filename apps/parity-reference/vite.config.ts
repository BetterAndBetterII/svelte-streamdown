import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appRoot, '../..');

export default defineConfig({
	cacheDir: resolve(appRoot, '.vite'),
	root: appRoot,
	plugins: [react()],
	assetsInclude: ['**/*.md'],
	resolve: {
		alias: {
			remend: resolve(repoRoot, 'references/streamdown/packages/remend/src/index.ts'),
			streamdown: resolve(repoRoot, 'references/streamdown/packages/streamdown/index.tsx')
		}
	}
});
