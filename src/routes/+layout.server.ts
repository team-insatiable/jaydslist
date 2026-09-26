import type { LayoutServerLoad } from './$types';
import { THEME_NAMES, type ThemeName } from '$lib/themes';
import { getInstanceConfig } from '$lib/server/instance';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
	const instance = getInstanceConfig(platform?.env);
	const raw = platform?.env?.INSTANCE_THEME ?? 'default';
	const themeName: ThemeName = THEME_NAMES.includes(raw as ThemeName)
		? (raw as ThemeName)
		: 'default';
	return {
		user: locals.user ?? null,
		prelaunchMode: instance.prelaunchMode,
		instanceName: instance.name,
		instanceTagline: instance.tagline,
		themeName
	};
};
