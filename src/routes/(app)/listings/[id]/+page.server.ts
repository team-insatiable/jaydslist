import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import {
	listings,
	listingRequirements,
	relativeTermDefinitions,
	userProfiles
} from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');

	const db = getDb(env.DB);

	const listing = await db
		.select({
			id: listings.id,
			userId: listings.userId,
			subject: listings.subject,
			body: listings.body,
			status: listings.status,
			lookingForIdentity: listings.lookingForIdentity,
			natureOfConnection: listings.natureOfConnection,
			mood: listings.mood,
			ageRangeMin: listings.ageRangeMin,
			ageRangeMax: listings.ageRangeMax,
			fuzzyLocation: listings.fuzzyLocation,
			expiresAt: listings.expiresAt,
			lastBumpedAt: listings.lastBumpedAt,
			createdAt: listings.createdAt,
			// poster info
			posterIdentity: userProfiles.identity,
			posterCoupleComposition: userProfiles.coupleComposition,
			posterAge: userProfiles.age,
			posterTrustTier: userProfiles.trustTier
		})
		.from(listings)
		.innerJoin(userProfiles, eq(listings.userId, userProfiles.id))
		.where(eq(listings.id, params.id))
		.get();

	if (!listing) throw error(404, 'Listing not found');

	const isOwner = locals.user?.id === listing.userId;
	const isAvailable = listing.status === 'active';

	// Non-owners can still see the listing exists, just not its full content
	if (!isAvailable && !isOwner) {
		return {
			listing: { id: listing.id, subject: listing.subject, status: listing.status },
			requirements: { ageMin: null, ageMax: null, trustTierMin: null, softPrompts: [] },
			termDefinitions: [],
			isOwner: false,
			isLoggedIn: !!locals.user,
			unavailable: true
		};
	}

	const reqs = await db
		.select()
		.from(listingRequirements)
		.where(eq(listingRequirements.listingId, params.id))
		.all();

	const termDefs = await db
		.select()
		.from(relativeTermDefinitions)
		.where(eq(relativeTermDefinitions.listingId, params.id))
		.all();

	const hardReqs = reqs.filter((r) => r.type === 'hard');
	const softReqs = reqs.filter((r) => r.type === 'soft');

	const ageMin = hardReqs.find((r) => r.field === 'age_min')?.value ?? null;
	const ageMax = hardReqs.find((r) => r.field === 'age_max')?.value ?? null;
	const trustTierReq = hardReqs.find((r) => r.field === 'trust_tier')?.value ?? null;

	return {
		listing: {
			id: listing.id,
			userId: listing.userId,
			subject: listing.subject,
			body: listing.body,
			status: listing.status,
			lookingForIdentity: JSON.parse(listing.lookingForIdentity) as string[],
			natureOfConnection: JSON.parse(listing.natureOfConnection) as string[],
			mood: listing.mood,
			ageRangeMin: listing.ageRangeMin,
			ageRangeMax: listing.ageRangeMax,
			fuzzyLocation: listing.fuzzyLocation,
			expiresAt: listing.expiresAt,
			lastBumpedAt: listing.lastBumpedAt,
			createdAt: listing.createdAt,
			posterIdentity: listing.posterIdentity,
			posterCoupleComposition: listing.posterCoupleComposition,
			posterAge: listing.posterAge,
			posterTrustTier: listing.posterTrustTier
		},
		requirements: {
			ageMin: ageMin ? parseInt(ageMin) : null,
			ageMax: ageMax ? parseInt(ageMax) : null,
			trustTierMin: trustTierReq,
			softPrompts: softReqs.map((r) => r.promptText).filter(Boolean) as string[]
		},
		termDefinitions: termDefs.map((t) => ({ term: t.term, definition: t.definition })),
		isOwner,
		isLoggedIn: !!locals.user,
		unavailable: false
	};
};

export const actions: Actions = {
	pause: async ({ params, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) throw error(500, 'Server configuration error');
		await getDb(env.DB)
			.update(listings)
			.set({ status: 'paused' })
			.where(and(eq(listings.id, params.id), eq(listings.userId, locals.user.id)));
		return { success: true };
	},

	resume: async ({ params, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) throw error(500, 'Server configuration error');
		await getDb(env.DB)
			.update(listings)
			.set({ status: 'active' })
			.where(and(eq(listings.id, params.id), eq(listings.userId, locals.user.id)));
		return { success: true };
	},

	restore: async ({ params, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) throw error(500, 'Server configuration error');
		await getDb(env.DB)
			.update(listings)
			.set({ status: 'paused' })
			.where(and(eq(listings.id, params.id), eq(listings.userId, locals.user.id)));
		return { success: true };
	},

	delete: async ({ params, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) throw error(500, 'Server configuration error');
		await getDb(env.DB)
			.update(listings)
			.set({ status: 'removed' })
			.where(and(eq(listings.id, params.id), eq(listings.userId, locals.user.id)));
		throw redirect(303, '/my-listings');
	}
};
