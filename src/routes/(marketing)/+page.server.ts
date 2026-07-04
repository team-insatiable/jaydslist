import { redirect } from '@sveltejs/kit';
import { DEFAULT_CONFIG } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(302, '/browse');

	return {
		instanceName: DEFAULT_CONFIG.INSTANCE_NAME,
		instanceTagline: DEFAULT_CONFIG.INSTANCE_TAGLINE
	};
};
