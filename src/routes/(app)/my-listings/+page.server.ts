import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { listings } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) throw redirect(302, '/login');

	const env = platform?.env;
	if (!env) throw new Error('Server configuration error');

	const myListings = await getDb(env.DB)
		.select({
			id: listings.id,
			subject: listings.subject,
			status: listings.status,
			natureOfConnection: listings.natureOfConnection,
			mood: listings.mood,
			fuzzyLocation: listings.fuzzyLocation,
			lastBumpedAt: listings.lastBumpedAt,
			expiresAt: listings.expiresAt,
			createdAt: listings.createdAt,
			bumpCount: listings.bumpCount
		})
		.from(listings)
		.where(eq(listings.userId, locals.user.id))
		.orderBy(desc(listings.createdAt))
		.all();

	return { myListings };
};
