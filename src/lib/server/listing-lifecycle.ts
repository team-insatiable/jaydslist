import { eq, and, inArray } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { listings, listingEvents } from '$lib/server/db/schema';
import { getConfig, getConfigInt } from '$lib/server/config';
import { randomUUID } from 'node:crypto';

/**
 * Lazily transitions listings whose status has fallen behind clock reality.
 * Call on every load of /my-listings so the owner always sees accurate state.
 *
 * Transitions:
 *   active | paused  →  expired   (when expires_at < now)
 *   expired          →  lapsed    (when expires_at + grace_period < now)
 */
export async function transitionExpiredListings(
	db: D1Database,
	env: Env,
	userId: string,
	isSupporter: boolean
): Promise<void> {
	const drizzle = getDb(db);
	const now = new Date();

	const graceKey = isSupporter ? 'SUPPORTER_GRACE_PERIOD_DAYS' : 'LISTING_GRACE_PERIOD_DAYS';
	const graceDays = getConfigInt(await getConfig(graceKey, env, db));

	const userListings = await drizzle
		.select({ id: listings.id, status: listings.status, expiresAt: listings.expiresAt })
		.from(listings)
		.where(
			and(
				eq(listings.userId, userId),
				inArray(listings.status, ['active', 'paused', 'expired'])
			)
		)
		.all();

	const toExpire: string[] = [];
	const toLapse: string[] = [];

	for (const listing of userListings) {
		if (!listing.expiresAt) continue;
		const expiresAt = new Date(listing.expiresAt);
		const lapseAt = new Date(expiresAt.getTime() + graceDays * 86400_000);

		if (listing.status === 'expired' && now > lapseAt) {
			toLapse.push(listing.id);
		} else if (
			(listing.status === 'active' || listing.status === 'paused') &&
			now > expiresAt
		) {
			if (now > lapseAt) {
				toLapse.push(listing.id);
			} else {
				toExpire.push(listing.id);
			}
		}
	}

	if (toExpire.length > 0) {
		await drizzle
			.update(listings)
			.set({ status: 'expired' })
			.where(and(eq(listings.userId, userId), inArray(listings.id, toExpire)));
	}

	if (toLapse.length > 0) {
		await drizzle
			.update(listings)
			.set({ status: 'lapsed' })
			.where(and(eq(listings.userId, userId), inArray(listings.id, toLapse)));
	}
}

export async function getMaxActiveListings(
	isSupporter: boolean,
	env: Env,
	db: D1Database
): Promise<number> {
	const key = isSupporter ? 'SUPPORTER_MAX_LISTINGS' : 'MAX_ACTIVE_LISTINGS';
	return getConfigInt(await getConfig(key, env, db));
}

export async function getActiveListingCount(db: D1Database, userId: string): Promise<number> {
	const rows = await getDb(db)
		.select({ id: listings.id })
		.from(listings)
		.where(and(eq(listings.userId, userId), eq(listings.status, 'active')))
		.all();
	return rows.length;
}

export async function relistListing(
	db: D1Database,
	env: Env,
	listingId: string,
	userId: string,
	isSupporter: boolean
): Promise<{ success: true } | { success: false; error: string }> {
	const drizzle = getDb(db);

	const listing = await drizzle
		.select({ id: listings.id, status: listings.status, userId: listings.userId })
		.from(listings)
		.where(and(eq(listings.id, listingId), eq(listings.userId, userId)))
		.get();

	if (!listing) return { success: false, error: 'Listing not found.' };
	if (listing.status !== 'expired' && listing.status !== 'lapsed') {
		return { success: false, error: 'Only expired or lapsed listings can be relisted.' };
	}

	const [maxActive, activeCount] = await Promise.all([
		getMaxActiveListings(isSupporter, env, db),
		getActiveListingCount(db, userId)
	]);

	if (activeCount >= maxActive) {
		return {
			success: false,
			error: `You already have ${activeCount} active listing${activeCount === 1 ? '' : 's'}. Pause or remove one before relisting.`
		};
	}

	const durationDays = getConfigInt(
		await getConfig(isSupporter ? 'SUPPORTER_LISTING_DURATION_DAYS' : 'LISTING_DURATION_DAYS', env, db)
	);
	const now = new Date();
	const expiresAt = new Date(now.getTime() + durationDays * 86400_000);

	await drizzle
		.update(listings)
		.set({
			status: 'active',
			expiresAt,
			lastBumpedAt: now,
			renewedAt: now
		})
		.where(eq(listings.id, listingId));

	await drizzle.insert(listingEvents).values({
		id: randomUUID(),
		listingId,
		eventType: 'renewed',
		actorId: userId
	});

	return { success: true };
}
