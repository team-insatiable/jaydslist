import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import {
	conversationThreads,
	listings,
	messages,
	userProfiles,
	DEFAULT_CONFIG
} from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

const CONTACT_INFO_PATTERN = /(\+?[\d\s\-().]{7,}|\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b)/i;

export const load: PageServerLoad = async ({ url, locals, platform }) => {
	if (!locals.user) throw redirect(302, '/login');

	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');

	const listingId = url.searchParams.get('listing');
	if (!listingId) throw redirect(302, '/browse');

	const userId = locals.user.id;
	const db = getDb(env.DB);

	const listing = await db
		.select({
			id: listings.id,
			userId: listings.userId,
			subject: listings.subject,
			status: listings.status,
			posterAlias: userProfiles.alias
		})
		.from(listings)
		.innerJoin(userProfiles, eq(listings.userId, userProfiles.id))
		.where(eq(listings.id, listingId))
		.get();

	if (!listing) throw error(404, 'Listing not found');
	if (listing.userId === userId) throw redirect(302, `/listings/${listingId}`);
	if (listing.status !== 'active') throw error(410, 'This listing is no longer active');

	// Redirect to existing thread if one exists
	const existing = await db
		.select({ id: conversationThreads.id })
		.from(conversationThreads)
		.where(
			and(
				eq(conversationThreads.listingId, listingId),
				eq(conversationThreads.initiatorId, userId)
			)
		)
		.get();

	if (existing) throw redirect(302, `/inbox/${existing.id}`);

	return {
		listing: {
			id: listing.id,
			subject: listing.subject,
			posterAlias: listing.posterAlias ?? 'Anonymous'
		},
		minLength: parseInt(DEFAULT_CONFIG.MESSAGE_MIN_LENGTH)
	};
};

export const actions: Actions = {
	send: async ({ url, request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');

		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const listingId = url.searchParams.get('listing');
		if (!listingId) return fail(400, { error: 'Missing listing' });

		const userId = locals.user.id;
		const db = getDb(env.DB);

		const listing = await db
			.select({ id: listings.id, userId: listings.userId, status: listings.status })
			.from(listings)
			.where(eq(listings.id, listingId))
			.get();

		if (!listing) return fail(404, { error: 'Listing not found' });
		if (listing.userId === userId) return fail(400, { error: 'You cannot reply to your own listing' });
		if (listing.status !== 'active') return fail(400, { error: 'This listing is no longer active' });

		// Prevent duplicate threads
		const existing = await db
			.select({ id: conversationThreads.id })
			.from(conversationThreads)
			.where(
				and(
					eq(conversationThreads.listingId, listingId),
					eq(conversationThreads.initiatorId, userId)
				)
			)
			.get();

		if (existing) throw redirect(303, `/inbox/${existing.id}`);

		const data = await request.formData();
		const body = (data.get('body') as string)?.trim() ?? '';
		const minLength = parseInt(DEFAULT_CONFIG.MESSAGE_MIN_LENGTH);

		if (body.length < minLength)
			return fail(400, { error: `Your message must be at least ${minLength} characters` });

		if (CONTACT_INFO_PATTERN.test(body))
			return fail(400, { error: 'Contact information cannot be included in your first message. Introduce yourself instead.' });

		const threadId = crypto.randomUUID();

		await db.insert(conversationThreads).values({
			id: threadId,
			listingId,
			initiatorId: userId,
			posterId: listing.userId,
			status: 'open',
			lastActivityAt: new Date()
		});
		await db.insert(messages).values({
			id: crypto.randomUUID(),
			threadId,
			senderId: userId,
			body,
			sentAt: new Date()
		});

		// Increment poster's total thread count and recalculate response rate
		const posterProfile = await db
			.select({ totalThreads: userProfiles.totalThreads, respondedThreads: userProfiles.respondedThreads })
			.from(userProfiles)
			.where(eq(userProfiles.id, listing.userId))
			.get();
		if (posterProfile) {
			const newTotal = posterProfile.totalThreads + 1;
			const rate = newTotal > 0 ? posterProfile.respondedThreads / newTotal : 0;
			await db.update(userProfiles)
				.set({ totalThreads: newTotal, responseRate: rate })
				.where(eq(userProfiles.id, listing.userId));
		}

		throw redirect(303, `/inbox/${threadId}`);
	}
};
