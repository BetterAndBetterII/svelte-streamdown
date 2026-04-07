import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import type { ViteDevServer } from 'vite';
import type { Stats } from 'node:fs';
import { copyFileSync, watchFile, unwatchFile } from 'node:fs';
import { resolve } from 'node:path';
import { coverageSourceExclude, coverageSourceInclude } from './config/coverage-suites.mjs';

const isTestMode = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
const isPlaywrightParity = process.env.PLAYWRIGHT_PARITY === '1';

// Plugin to copy README.md from root to src folder
function copyReadmePlugin() {
	const rootReadme = resolve('README.md');
	const srcReadme = resolve('src/README.md');

	const copyReadme = () => {
		try {
			copyFileSync(rootReadme, srcReadme);
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
			if (isTestMode || server.config.mode === 'test') {
				return;
			}

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
	logLevel: isTestMode ? 'error' : undefined,
	optimizeDeps: isPlaywrightParity
		? undefined
		: {
				// Browser-mode Vitest needs these eagerly optimized to avoid mid-run reloads.
				// Playwright parity boots plain Vite dev servers, where front-loading Shiki
				// can stall CI startup long enough to trip config.webServer timeouts.
				include: [
					'rehype-katex',
					'remark-math',
					'shiki/core',
					'shiki/engine/javascript',
					'@shikijs/langs/javascript',
					'@shikijs/themes/github-dark',
					'@shikijs/themes/github-light'
				]
			},
	server: {
		fs: {
			allow: [resolve('.'), resolve('packages')]
		}
	},
	resolve: {
		alias: {
			'@streamdown/plugin-core': resolve('packages/streamdown-plugin-core/src/index.ts'),
			'@streamdown/code': resolve('packages/streamdown-code/index.ts'),
			'@streamdown/math': resolve('packages/streamdown-math/index.ts'),
			'@streamdown/mermaid': resolve('packages/streamdown-mermaid/index.ts'),
			'@streamdown/cjk': resolve('packages/streamdown-cjk/index.ts')
		}
	},
	plugins: [tailwindcss(), sveltekit(), devtoolsJson(), copyReadmePlugin()],
	assetsInclude: ['**/*.md'],
	test: {
		expect: { requireAssertions: true },
		reporters: ['dot'],
		silent: 'passed-only',
		coverage: {
			all: true,
			provider: 'v8',
			reporter: ['text-summary', 'json-summary', 'html'],
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
					include: [
						'src/**/*.{test,spec}.{js,ts}',
						'tests/**/*.{test,spec}.{js,ts}',
						'packages/**/*.{test,spec}.{js,ts}'
					],
					exclude: [
						'src/**/*.svelte.{test,spec}.{js,ts}',
						'tests/**/*.svelte.{test,spec}.{js,ts}',
						'packages/**/*.svelte.{test,spec}.{js,ts}',
						'tests/playwright/**',
						'tests/pack-smoke/**',
						'packages/**/dist/**'
					]
				}
			}
		]
	}
});
