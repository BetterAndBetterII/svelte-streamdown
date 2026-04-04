import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import type { ViteDevServer } from 'vite';
import type { Stats } from 'node:fs';
import { copyFileSync, watchFile, unwatchFile } from 'node:fs';
import { resolve } from 'node:path';
import { coverageSourceExclude, coverageSourceInclude } from './config/coverage-suites.mjs';

// Plugin to copy README.md from root to src folder
function copyReadmePlugin() {
	const rootReadme = resolve('README.md');
	const srcReadme = resolve('src/README.md');

	const copyReadme = () => {
		try {
			copyFileSync(rootReadme, srcReadme);
			console.log('📝 Copied README.md to src folder');
		} catch (error) {
			console.error('❌ Failed to copy README.md:', error);
		}
	};

	return {
		name: 'copy-readme',
		buildStart() {
			// Copy on build start
			copyReadme();
		},
		configureServer(server: ViteDevServer) {
			// Watch and copy during development
			const onReadmeChange = (curr: Stats, prev: Stats) => {
				if (curr.mtime !== prev.mtime) {
					copyReadme();
					// Trigger HMR update
					server.ws.send({ type: 'full-reload' });
				}
			};

			watchFile(rootReadme, onReadmeChange);

			// Cleanup on server close
			server.httpServer?.on('close', () => {
				unwatchFile(rootReadme, onReadmeChange);
			});
		}
	};
}

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson(), copyReadmePlugin()],
	assetsInclude: ['**/*.md'],
	test: {
		expect: { requireAssertions: true },
		coverage: {
			all: true,
			provider: 'v8',
			reporter: ['text', 'json-summary', 'html'],
			reportsDirectory: './coverage/default',
			include: coverageSourceInclude,
			exclude: coverageSourceExclude
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					include: ['src/**/*.svelte.{test,spec}.{js,ts}', 'tests/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**', 'tests/pack-smoke/**'],
					browser: {
						enabled: true,
						provider: 'playwright',
						headless: true,
						instances: [{ browser: 'chromium' }]
					},
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
					exclude: [
						'src/**/*.svelte.{test,spec}.{js,ts}',
						'tests/**/*.svelte.{test,spec}.{js,ts}',
						'tests/playwright/**',
						'tests/pack-smoke/**'
					]
				}
			}
		]
	}
});
