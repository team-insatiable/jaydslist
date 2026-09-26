export type InstanceConfig = {
	name: string;
	tagline: string;
	url: string;
	legalEmail: string;
	sourceUrl: string;
	prelaunchMode: boolean;
};

const defaults: InstanceConfig = {
	name: 'Jaydslist',
	tagline: 'Real connections, real people',
	url: 'https://example.com',
	legalEmail: 'operator@example.com',
	sourceUrl: 'https://github.com/team-insatiable/jaydslist',
	prelaunchMode: false
};

function value(env: Partial<Env> | undefined, key: keyof InstanceConfig): string {
	const envKey = `INSTANCE_${key === 'name' ? 'NAME' : key === 'tagline' ? 'TAGLINE' : key === 'url' ? 'URL' : key === 'legalEmail' ? 'LEGAL_EMAIL' : 'SOURCE_URL'}`;
	const candidate = (env as Record<string, string | undefined> | undefined)?.[envKey]?.trim();
	return candidate || String(defaults[key]);
}

/**
 * Public identity belongs to the operator, not the upstream application.
 * Operators set these values in their deployment configuration; the defaults
 * keep local development and a fresh fork usable without claiming a real site.
 */
export function getInstanceConfig(env?: Partial<Env>): InstanceConfig {
	return {
		name: value(env, 'name'),
		tagline: value(env, 'tagline'),
		url: value(env, 'url'),
		legalEmail: value(env, 'legalEmail'),
		sourceUrl: value(env, 'sourceUrl'),
		prelaunchMode: env?.INSTANCE_PRELAUNCH_MODE === 'true'
	};
}
