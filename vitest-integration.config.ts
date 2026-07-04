import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';

export default defineConfig({
	plugins: [
		sveltekit(),
		cloudflareTest({
			wrangler: { configPath: './wrangler.test.jsonc' }
		})
	],
	test: {
		include: ['src/**/*.integration.test.ts'],
		pool: '@cloudflare/vitest-pool-workers',
		setupFiles: ['./src/lib/server/test-helpers/apply-migrations.ts']
	}
});
