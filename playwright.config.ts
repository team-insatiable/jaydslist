import { defineConfig } from '@playwright/test';
import { E2E_ORIGIN } from './e2e/local-environment.js';

export default defineConfig({
	testDir: 'e2e',
	globalSetup: './e2e/global-setup.ts',
	fullyParallel: false,
	workers: 2,
	retries: process.env.CI ? 1 : 0,
	timeout: 20_000,
	use: {
		baseURL: E2E_ORIGIN,
		trace: 'retain-on-failure'
	},
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
	webServer: {
		command: 'pnpm dev --host localhost --port 5174 --strictPort',
		env: { JAYDSLIST_E2E: '1' },
		url: E2E_ORIGIN,
		reuseExistingServer: false,
		timeout: 60_000
	}
});
