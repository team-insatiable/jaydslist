import type { LayoutServerLoad } from './$types';
import { requirePhoneVerifiedRedirect } from '$lib/server/guards/requirePhoneVerified';

export const load: LayoutServerLoad = async ({ locals }) => {
	requirePhoneVerifiedRedirect(locals);
	return { user: locals.user };
};
