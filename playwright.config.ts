import { defineConfig } from '@playwright/test';

const referencePort = 4173;
const localPort = 4174;

export default defineConfig({
	testDir: './tests/playwright',
	timeout: 30_000,
	fullyParallel: true,
	retries: process.env.CI ? 2 : 0,
	use: {
		colorScheme: 'light',
		deviceScaleFactor: 1,
		headless: true,
		locale: 'en-US',
		reducedMotion: 'reduce',
		timezoneId: 'UTC',
		viewport: {
			width: 1280,
			height: 900
		}
	},
	webServer: [
		{
			command: `pnpm exec vite --config apps/parity-reference/vite.config.ts --host 127.0.0.1 --port ${referencePort}`,
			url: `http://127.0.0.1:${referencePort}`,
			reuseExistingServer: !process.env.CI,
			timeout: 120_000
		},
		{
			command: `pnpm exec vite --config apps/parity-local/vite.config.ts --host 127.0.0.1 --port ${localPort}`,
			url: `http://127.0.0.1:${localPort}`,
			reuseExistingServer: !process.env.CI,
			timeout: 120_000
		}
	]
});
