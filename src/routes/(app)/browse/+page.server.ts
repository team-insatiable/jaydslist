import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { listings, userProfiles, userBlocks } from '$lib/server/db/schema';
import { eq, desc, and, gt, or } from 'drizzle-orm';

const VALID_RADII = [5, 10, 25, 50, 100];
const VALID_NATURE = ['dating', 'fwb', 'one_time', 'platonic', 'open'];

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) throw redirect(302, '/login');

	const env = platform?.env;
	if (!env) throw new Error('Server configuration error');

	const db = getDb(env.DB);

	const profile = await db
		.select({
			identity: userProfiles.identity,
			lat: userProfiles.lat,
			lng: userProfiles.lng,
			locationUpdatedAt: userProfiles.locationUpdatedAt,
			seekingIdentity: userProfiles.seekingIdentity,
			seekingNatureOfConnection: userProfiles.seekingNatureOfConnection,
			browseRadius: userProfiles.browseRadius
		})
		.from(userProfiles)
		.where(eq(userProfiles.id, locals.user.id))
		.get();

	const locationSet = !!(profile?.lat != null && profile?.lng != null);

	if (!profile?.identity || !locationSet) {
		return {
			gated: true as const,
			missingIdentity: !profile?.identity,
			missingLocation: !locationSet,
			listings: [],
			radius: 25,
			natureFilter: null as string | null
		};
	}

	const radiusParam = parseInt(url.searchParams.get('radius') ?? '');
	const radius = VALID_RADII.includes(radiusParam) ? radiusParam : (profile.browseRadius ?? 25);

	const natureFilter = url.searchParams.get('nature') ?? null;
	const validNatureFilter =
		natureFilter && VALID_NATURE.includes(natureFilter) ? natureFilter : null;

	const now = new Date();

	// Build block set: exclude listings from users who blocked me or whom I blocked
	const blockedUserIds = new Set<string>();
	const userId = locals.user.id;
	const blockRows = await db
		.select({ blockerId: userBlocks.blockerId, blockedId: userBlocks.blockedId })
		.from(userBlocks)
		.where(or(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedId, userId)))
		.all();
	for (const b of blockRows) {
		blockedUserIds.add(b.blockerId === userId ? b.blockedId : b.blockerId);
	}

	const rows = await db
		.select({
			id: listings.id,
			userId: listings.userId,
			subject: listings.subject,
			lookingForIdentity: listings.lookingForIdentity,
			natureOfConnection: listings.natureOfConnection,
			mood: listings.mood,
			availability: listings.availability,
			fuzzyLocation: listings.fuzzyLocation,
			lat: listings.lat,
			lng: listings.lng,
			lastBumpedAt: listings.lastBumpedAt,
			createdAt: listings.createdAt,
			posterIdentity: userProfiles.identity,
			posterAge: userProfiles.age,
			posterTrustTier: userProfiles.trustTier,
			posterPrivacyMode: userProfiles.privacyMode
		})
		.from(listings)
		.innerJoin(userProfiles, eq(listings.userId, userProfiles.id))
		.where(and(eq(listings.status, 'active'), gt(listings.expiresAt, now)))
		.orderBy(desc(listings.lastBumpedAt))
		.limit(300);

	const userLat = profile.lat!;
	const userLng = profile.lng!;
	const seekingIdentity: string[] = JSON.parse(profile.seekingIdentity ?? '[]');
	const seekingNature: string[] = JSON.parse(profile.seekingNatureOfConnection ?? '[]');

	const results = [];

	for (const row of rows) {
		if (row.lat == null || row.lng == null) continue;
		if (blockedUserIds.has(row.userId)) continue;

		// Haversine distance in miles
		const R = 3958.8;
		const dLat = ((row.lat - userLat) * Math.PI) / 180;
		const dLng = ((row.lng - userLng) * Math.PI) / 180;
		const a =
			Math.sin(dLat / 2) ** 2 +
			Math.cos((userLat * Math.PI) / 180) *
				Math.cos((row.lat * Math.PI) / 180) *
				Math.sin(dLng / 2) ** 2;
		const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		if (distance > radius) continue;

		const nature: string[] = JSON.parse(row.natureOfConnection ?? '[]');
		const lookingFor: string[] = JSON.parse(row.lookingForIdentity ?? '[]');

		// URL nature filter
		if (validNatureFilter && !nature.includes(validNatureFilter) && !nature.includes('open'))
			continue;

		// User's seeking nature pref (skip if empty = all, or if listing is open)
		if (seekingNature.length > 0 && !seekingNature.includes('open')) {
			const hasMatch = nature.some((n) => n === 'open' || seekingNature.includes(n));
			if (!hasMatch) continue;
		}

		// User's seeking identity pref (skip if empty = all)
		if (seekingIdentity.length > 0 && row.posterIdentity) {
			if (!seekingIdentity.includes(row.posterIdentity)) continue;
		}

		const privacy = row.posterPrivacyMode ?? false;
		results.push({
			id: row.id,
			subject: row.subject,
			identity: (row.posterIdentity ?? 'other') as string,
			age: row.posterAge ?? 0,
			lookingFor,
			nature,
			mood: row.mood ?? null,
			availability: row.availability ?? null,
			trustTier: (row.posterTrustTier ?? 'new') as 'new' | 'established' | 'trusted',
			fuzzyLocation: privacy ? 'Location hidden' : (row.fuzzyLocation ?? ''),
			distance: privacy ? null : Math.round(distance),
			postedAt: row.lastBumpedAt ?? row.createdAt ?? now
		});
	}

	return {
		gated: false as const,
		listings: results,
		radius,
		natureFilter: validNatureFilter
	};
};
