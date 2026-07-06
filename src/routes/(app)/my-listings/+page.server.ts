import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { listings, userProfiles } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getConfig, getConfigInt } from '$lib/server/config';
import {
	transitionExpiredListings,
	getMaxActiveListings,
	getActiveListingCount,
	relistListing
} from '$lib/server/listing-lifecycle';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) throw redirect(302, '/login');

	const env = platform?.env;
	if (!env) throw new Error('Server configuration error');

	const profile = await getDb(env.DB)
		.select({ isSupporter: userProfiles.isSupporter })
		.from(userProfiles)
		.where(eq(userProfiles.id, locals.user.id))
		.get();

	const isSupporter = profile?.isSupporter ?? false;

	await transitionExpiredListings(env.DB, env, locals.user.id, isSupporter);

	const [myListings, activeCount, maxActive, graceDays] = await Promise.all([
		getDb(env.DB)
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
			.all(),
		getActiveListingCount(env.DB, locals.user.id),
		getMaxActiveListings(isSupporter, env, env.DB),
		getConfig(
			isSupporter ? 'SUPPORTER_GRACE_PERIOD_DAYS' : 'LISTING_GRACE_PERIOD_DAYS',
			env,
			env.DB
		).then(getConfigInt)
	]);

	return { myListings, activeCount, maxActive, graceDays };
};

export const actions: Actions = {
	relist: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');

		const env = platform?.env;
		if (!env) throw new Error('Server configuration error');

		const data = await request.formData();
		const listingId = data.get('listingId');
		if (typeof listingId !== 'string' || !listingId) {
			return fail(400, { error: 'Missing listing ID.' });
		}

		const profile = await getDb(env.DB)
			.select({ isSupporter: userProfiles.isSupporter })
			.from(userProfiles)
			.where(eq(userProfiles.id, locals.user.id))
			.get();

		const result = await relistListing(
			env.DB,
			env,
			listingId,
			locals.user.id,
			profile?.isSupporter ?? false
		);

		if (!result.success) return fail(400, { error: result.error });
		return { relisted: true };
	}
};
