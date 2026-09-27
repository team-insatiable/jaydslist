import { fileURLToPath } from 'node:url';

export const E2E_ORIGIN = 'http://localhost:5174';
export const E2E_CONFIG = fileURLToPath(new URL('./wrangler.jsonc', import.meta.url));
export const E2E_STATE = fileURLToPath(new URL('../.wrangler/e2e', import.meta.url));

export const E2E_PLATFORM_PROXY = {
	configPath: E2E_CONFIG,
	// Wrangler --persist-to adds /v3; getPlatformProxy does not.
	persist: { path: `${E2E_STATE}/v3` },
	remoteBindings: false,
	envFiles: []
};
