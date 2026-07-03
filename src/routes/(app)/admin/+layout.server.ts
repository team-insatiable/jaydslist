import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
	if (!locals.user) throw redirect(302, '/login');

	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');

	const adminEmails = (env.ADMIN_EMAILS ?? '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
	if (adminEmails.length === 0) throw error(403, 'Admin access not configured');

	const currentUser = await getDb(env.DB)
		.select({ email: user.email })
		.from(user)
		.where(eq(user.id, locals.user.id))
		.get();

	if (!currentUser || !adminEmails.includes(currentUser.email.toLowerCase())) {
		throw error(403, 'Forbidden');
	}

	return { adminEmail: currentUser.email };
};
