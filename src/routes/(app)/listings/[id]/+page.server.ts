import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import {
	listings,
	listingRequirements,
	relativeTermDefinitions,
	listingEvents,
	listingPhotos,
	photoVault,
	userProfiles,
	conversationThreads,
	reports,
	DEFAULT_CONFIG
} from '$lib/server/db/schema';
import { eq, and, isNull, count } from 'drizzle-orm';
import { isBumpCooldownActive, getNextBumpAt } from '$lib/server/listing-bump';
import { imageUrl } from '$lib/server/cloudflare-images';

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
			posterTrustTier: userProfiles.trustTier,
			posterAlias: userProfiles.alias,
			posterPrivacyMode: userProfiles.privacyMode
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
			photos: [],
			isOwner: false,
			isLoggedIn: !!locals.user,
			unavailable: true
		};
	}

	// Check for existing thread (for logged-in non-owners)
	let existingThreadId: string | null = null;
	if (locals.user && !isOwner) {
		const existing = await db
			.select({ id: conversationThreads.id })
			.from(conversationThreads)
			.where(
				and(
					eq(conversationThreads.listingId, params.id),
					eq(conversationThreads.initiatorId, locals.user.id)
				)
			)
			.get();
		existingThreadId = existing?.id ?? null;
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

	const photoRows = await db
		.select({
			id: listingPhotos.id,
			cfImageId: photoVault.cfImageId,
			displayOrder: listingPhotos.displayOrder
		})
		.from(listingPhotos)
		.innerJoin(photoVault, eq(listingPhotos.vaultPhotoId, photoVault.id))
		.where(
			and(
				eq(listingPhotos.listingId, params.id),
				isNull(listingPhotos.purgedAt),
				isNull(photoVault.deletedAt)
			)
		)
		.orderBy(listingPhotos.displayOrder)
		.all();

	const photos = photoRows.map((p) => ({
		id: p.id,
		deliveryUrl: imageUrl(env.CF_IMAGES_ACCOUNT_HASH, p.cfImageId)
	}));

	const hardReqs = reqs.filter((r) => r.type === 'hard');
	const softReqs = reqs.filter((r) => r.type === 'soft');

	const ageMin = hardReqs.find((r) => r.field === 'age_min')?.value ?? null;
	const ageMax = hardReqs.find((r) => r.field === 'age_max')?.value ?? null;
	const trustTierReq = hardReqs.find((r) => r.field === 'trust_tier')?.value ?? null;

	const bumpCooldownHours = parseInt(DEFAULT_CONFIG.LISTING_BUMP_COOLDOWN_HOURS);
	const canBump =
		isOwner &&
		listing.status === 'active' &&
		!isBumpCooldownActive(listing.lastBumpedAt, bumpCooldownHours);
	const nextBumpAt = isOwner ? getNextBumpAt(listing.lastBumpedAt, bumpCooldownHours) : null;

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
			fuzzyLocation: listing.posterPrivacyMode ? 'Location hidden' : listing.fuzzyLocation,
			expiresAt: listing.expiresAt,
			lastBumpedAt: listing.lastBumpedAt,
			createdAt: listing.createdAt,
			posterIdentity: listing.posterIdentity,
			posterCoupleComposition: listing.posterCoupleComposition,
			posterAge: listing.posterAge,
			posterTrustTier: listing.posterTrustTier,
			posterAlias: listing.posterAlias ?? 'Anonymous'
		},
		existingThreadId,
		requirements: {
			ageMin: ageMin ? parseInt(ageMin) : null,
			ageMax: ageMax ? parseInt(ageMax) : null,
			trustTierMin: trustTierReq,
			softPrompts: softReqs.map((r) => r.promptText).filter(Boolean) as string[]
		},
		termDefinitions: termDefs.map((t) => ({ term: t.term, definition: t.definition })),
		photos,
		isOwner,
		isLoggedIn: !!locals.user,
		unavailable: false,
		canBump,
		nextBumpAt
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

		const db = getDb(env.DB);

		const activeCount = await db
			.select({ id: listings.id })
			.from(listings)
			.where(and(eq(listings.userId, locals.user.id), eq(listings.status, 'active')))
			.all();

		if (activeCount.length >= 1) {
			return fail(400, {
				error: 'You already have an active listing. Pause it before resuming another.'
			});
		}

		await db
			.update(listings)
			.set({ status: 'active' })
			.where(and(eq(listings.id, params.id), eq(listings.userId, locals.user.id)));

		const [totalRow] = await db
			.select({ n: count() })
			.from(listingPhotos)
			.where(eq(listingPhotos.listingId, params.id));
		const [activeRow] = await db
			.select({ n: count() })
			.from(listingPhotos)
			.where(and(eq(listingPhotos.listingId, params.id), isNull(listingPhotos.purgedAt)));

		return { success: true, purgedPhotoCount: totalRow.n - activeRow.n };
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

	bump: async ({ params, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const db = getDb(env.DB);

		const listing = await db
			.select({
				id: listings.id,
				userId: listings.userId,
				status: listings.status,
				lastBumpedAt: listings.lastBumpedAt
			})
			.from(listings)
			.where(and(eq(listings.id, params.id), eq(listings.userId, locals.user.id)))
			.get();

		if (!listing) return fail(404, { error: 'Listing not found' });
		if (listing.status !== 'active')
			return fail(400, { error: 'Only active listings can be bumped' });

		const cooldownHours = parseInt(DEFAULT_CONFIG.LISTING_BUMP_COOLDOWN_HOURS);
		if (isBumpCooldownActive(listing.lastBumpedAt, cooldownHours))
			return fail(400, { error: 'Bump cooldown has not expired yet' });

		const now = new Date();
		await db.update(listings).set({ lastBumpedAt: now }).where(eq(listings.id, params.id));
		await db.insert(listingEvents).values({
			id: crypto.randomUUID(),
			listingId: params.id,
			eventType: 'bumped',
			actorId: locals.user.id
		});

		return { bumped: true };
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
	},

	report: async ({ params, request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');
		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const userId = locals.user.id;
		const db = getDb(env.DB);

		const listing = await db
			.select({ userId: listings.userId })
			.from(listings)
			.where(eq(listings.id, params.id))
			.get();
		if (!listing) return fail(404, { error: 'Listing not found' });
		if (listing.userId === userId) return fail(400, { error: 'Cannot report your own listing' });

		const data = await request.formData();
		const category = data.get('category') as string;
		const detail = (data.get('detail') as string)?.trim() || null;

		const VALID_CATEGORIES = [
			'harassment',
			'spam',
			'fake_profile',
			'explicit_content',
			'unsolicited_dm',
			'other'
		];
		if (!VALID_CATEGORIES.includes(category)) return fail(400, { error: 'Invalid category' });

		const reporter = await db
			.select({ reporterTrustScore: userProfiles.reporterTrustScore })
			.from(userProfiles)
			.where(eq(userProfiles.id, userId))
			.get();

		await db.insert(reports).values({
			id: crypto.randomUUID(),
			reporterId: userId,
			targetType: 'listing',
			targetId: params.id,
			category,
			detail,
			reporterTrustScoreSnapshot: reporter?.reporterTrustScore ?? 0.5
		});

		return { reported: true };
	}
};
