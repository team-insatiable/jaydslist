import { redirect } from '@sveltejs/kit';
import { getInstanceConfig } from '$lib/server/instance';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (locals.user) throw redirect(302, '/browse');
	const instance = getInstanceConfig(platform?.env);

	return {
		instanceName: instance.name,
		instanceTagline: instance.tagline
	};
};
