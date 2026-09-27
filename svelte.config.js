import adapter from '@sveltejs/adapter-cloudflare';
import { mdsvex } from 'mdsvex';
import { E2E_PLATFORM_PROXY } from './e2e/local-environment.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	extensions: ['.svelte', '.md'],
	preprocess: mdsvex({ extensions: ['.md'] }),
	kit: {
		adapter: adapter(
			process.env.JAYDSLIST_E2E === '1'
				? { platformProxy: E2E_PLATFORM_PROXY }
				: { platformProxy: { remoteBindings: false } }
		),
		typescript: {
			config: (config) => ({
				...config,
				include: [...config.include, '../drizzle.config.ts']
			})
		}
	}
};

export default config;
