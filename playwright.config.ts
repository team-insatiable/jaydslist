import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	globalSetup: './e2e/global-setup.ts',
	fullyParallel: false,
	retries: process.env.CI ? 1 : 0,
	timeout: 20_000,
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'retain-on-failure'
	},
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
	webServer: {
		command: 'pnpm dev',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
		timeout: 60_000
	}
});
