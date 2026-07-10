import type { LayoutServerLoad } from './$types';
import { THEME_NAMES, type ThemeName } from '$lib/themes';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
	const raw = platform?.env?.INSTANCE_THEME ?? 'default';
	const themeName: ThemeName = THEME_NAMES.includes(raw as ThemeName)
		? (raw as ThemeName)
		: 'default';
	return {
		user: locals.user ?? null,
		themeName
	};
};
