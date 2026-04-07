import { defineConfig } from '@playwright/test';

const referencePort = 4173;
const localPort = 4174;
const appPort = 4175;

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
			command: `PLAYWRIGHT_PARITY=1 FORCE_COLOR=0 NO_COLOR=1 pnpm exec vite --config apps/parity-reference/vite.config.ts --host 127.0.0.1 --port ${referencePort}`,
			url: `http://127.0.0.1:${referencePort}`,
			reuseExistingServer: !process.env.CI,
			timeout: 180_000
		},
		{
			command: `PLAYWRIGHT_PARITY=1 FORCE_COLOR=0 NO_COLOR=1 pnpm exec vite --config apps/parity-local/vite.config.ts --host 127.0.0.1 --port ${localPort}`,
			url: `http://127.0.0.1:${localPort}`,
			reuseExistingServer: !process.env.CI,
			timeout: 180_000
		},
		{
			command: `PLAYWRIGHT_PARITY=1 FORCE_COLOR=0 NO_COLOR=1 pnpm exec vite --host 127.0.0.1 --port ${appPort}`,
			url: `http://127.0.0.1:${appPort}`,
			reuseExistingServer: !process.env.CI,
			timeout: 180_000
		}
	]
});
