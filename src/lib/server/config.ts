import { DEFAULT_CONFIG, platformConfig } from '$lib/server/db/schema';
import { getDb } from '$lib/server/db';
import { eq } from 'drizzle-orm';

export type ConfigKey = keyof typeof DEFAULT_CONFIG;

/**
 * Reads a config value with precedence:
 *   platform_config DB row > matching env var > DEFAULT_CONFIG fallback
 *
 * Self-hosters set env vars in wrangler.jsonc (vars section) for deploy-time
 * defaults. The admin panel writes to platform_config for live overrides.
 */
export async function getConfig(key: ConfigKey, env: Env, db: D1Database): Promise<string> {
	const row = await getDb(db)
		.select({ value: platformConfig.value })
		.from(platformConfig)
		.where(eq(platformConfig.key, key))
		.get();

	if (row) return row.value;

	const envVal = (env as unknown as Record<string, string | undefined>)[key];
	if (envVal !== undefined) return envVal;

	return DEFAULT_CONFIG[key];
}

export function getConfigInt(value: string): number {
	return parseInt(value, 10);
}

export function getConfigFloat(value: string): number {
	return parseFloat(value);
}

export function getConfigBool(value: string): boolean {
	return value === 'true';
}
