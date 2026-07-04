import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		exclude: [...configDefaults.exclude, '**/*.integration.test.ts', 'e2e/**']
	}
});
