import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import {
	listings,
	listingRequirements,
	relativeTermDefinitions,
	listingEvents,
	userProfiles
} from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';


const MAX_ACTIVE_LISTINGS = 1; // free tier

const VALID_IDENTITIES = [
	'man',
	'woman',
	'non_binary',
	'transgender_man',
	'transgender_woman',
	'other',
	'couple'
];
const VALID_NATURE = ['dating', 'fwb', 'one_time', 'platonic', 'open'];
const VALID_MOODS = ['coffee_first', 'dinner_date', 'netflix_chill', 'ready_now', 'just_browsing'];
const VALID_AVAILABILITY = ['available_now', 'available_today', 'available_weekend', 'flexible'];
const VALID_TRUST_TIERS = ['new', 'established', 'trusted'];
const LISTING_DURATION_DAYS = 14;

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) throw redirect(302, '/login');

	const env = platform?.env;
	if (!env) throw new Error('Server configuration error');

	const profile = await getDb(env.DB)
		.select({ identity: userProfiles.identity, lat: userProfiles.lat, lng: userProfiles.lng })
		.from(userProfiles)
		.where(eq(userProfiles.id, locals.user.id))
		.get();

	if (!profile?.identity || profile.lat == null || profile.lng == null) {
		throw redirect(302, '/profile');
	}

	const activeListings = await getDb(env.DB)
		.select({ id: listings.id })
		.from(listings)
		.where(and(eq(listings.userId, locals.user.id), eq(listings.status, 'active')))
		.all();

	return { hasActiveListing: activeListings.length >= MAX_ACTIVE_LISTINGS };
};

export const actions: Actions = {
	post: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');

		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();

		const lookingForRaw = data.getAll('lookingFor') as string[];
		const ageMinRaw = (data.get('ageMin') as string) || '';
		const ageMaxRaw = (data.get('ageMax') as string) || '';
		const natureRaw = data.getAll('nature') as string[];
		const mood = (data.get('mood') as string) || null;
		const availability = (data.get('availability') as string) || null;
		const subject = ((data.get('subject') as string) || '').trim();
		const body = ((data.get('body') as string) || '').trim();
		const termKeys = data.getAll('termKey') as string[];
		const termValues = data.getAll('termValue') as string[];
		const trustTierMin = (data.get('trustTierMin') as string) || 'new';
		const softReqsRaw = data.getAll('softReq') as string[];

		const lookingFor = lookingForRaw.filter((v) => VALID_IDENTITIES.includes(v));
		const nature = natureRaw.filter((v) => VALID_NATURE.includes(v));

		if (nature.length === 0) return fail(400, { error: 'Select at least one nature of connection' });
		if (mood && !VALID_MOODS.includes(mood)) return fail(400, { error: 'Invalid mood' });
		if (availability && !VALID_AVAILABILITY.includes(availability))
			return fail(400, { error: 'Invalid availability' });
		if (!subject || subject.length < 10)
			return fail(400, { error: 'Subject must be at least 10 characters' });
		if (subject.length > 120) return fail(400, { error: 'Subject must be 120 characters or less' });
		if (!body || body.length < 50)
			return fail(400, { error: 'Listing body must be at least 50 characters' });
		if (!VALID_TRUST_TIERS.includes(trustTierMin)) return fail(400, { error: 'Invalid trust tier' });

		const ageMin = ageMinRaw ? parseInt(ageMinRaw) : null;
		const ageMax = ageMaxRaw ? parseInt(ageMaxRaw) : null;
		if (ageMin !== null && (isNaN(ageMin) || ageMin < 18 || ageMin > 99))
			return fail(400, { error: 'Invalid minimum age' });
		if (ageMax !== null && (isNaN(ageMax) || ageMax < 18 || ageMax > 99))
			return fail(400, { error: 'Invalid maximum age' });
		if (ageMin !== null && ageMax !== null && ageMin > ageMax)
			return fail(400, { error: 'Minimum age cannot exceed maximum age' });

		const db = getDb(env.DB);

		const activeListings = await db
			.select({ id: listings.id })
			.from(listings)
			.where(and(eq(listings.userId, locals.user.id), eq(listings.status, 'active')))
			.all();

		if (activeListings.length >= MAX_ACTIVE_LISTINGS) {
			return fail(400, { error: `You already have an active listing. You can post another after it expires or is removed.` });
		}

		const profile = await db
			.select({ lat: userProfiles.lat, lng: userProfiles.lng })
			.from(userProfiles)
			.where(eq(userProfiles.id, locals.user.id))
			.get();

		if (!profile?.lat || !profile?.lng)
			return fail(400, { error: 'Location not set. Please update your profile first.' });

		const cf = platform?.cf;
		const city = cf?.city as string | undefined;
		const region = cf?.region as string | undefined;
		const fuzzyLocation = city ? `${city} area` : region ? region : 'Nearby area';

		const now = new Date();
		const expiresAt = new Date(now.getTime() + LISTING_DURATION_DAYS * 24 * 60 * 60 * 1000);
		const listingId = crypto.randomUUID();

		await db.insert(listings).values({
			id: listingId,
			userId: locals.user.id,
			subject,
			body,
			lookingForIdentity: JSON.stringify(lookingFor),
			natureOfConnection: JSON.stringify(nature),
			mood,
			availability,
			ageRangeMin: ageMin,
			ageRangeMax: ageMax,
			lat: profile.lat,
			lng: profile.lng,
			fuzzyLocation,
			expiresAt,
			lastBumpedAt: now
		});

		const reqs: {
			id: string;
			listingId: string;
			type: string;
			field: string;
			value: string;
			promptText?: string;
		}[] = [];

		if (ageMin !== null)
			reqs.push({ id: crypto.randomUUID(), listingId, type: 'hard', field: 'age_min', value: String(ageMin) });
		if (ageMax !== null)
			reqs.push({ id: crypto.randomUUID(), listingId, type: 'hard', field: 'age_max', value: String(ageMax) });
		if (trustTierMin !== 'new')
			reqs.push({ id: crypto.randomUUID(), listingId, type: 'hard', field: 'trust_tier', value: trustTierMin });

		for (const prompt of softReqsRaw) {
			const trimmed = prompt.trim();
			if (trimmed) reqs.push({ id: crypto.randomUUID(), listingId, type: 'soft', field: 'prompt', value: 'acknowledged', promptText: trimmed });
		}

		if (reqs.length > 0) await db.insert(listingRequirements).values(reqs);

		const termDefs = termKeys
			.map((k, i) => ({ term: k.trim().toLowerCase(), definition: (termValues[i] ?? '').trim() }))
			.filter((t) => t.term && t.definition);

		if (termDefs.length > 0) {
			await db.insert(relativeTermDefinitions).values(
				termDefs.map((t) => ({ id: crypto.randomUUID(), listingId, term: t.term, definition: t.definition }))
			);
		}

		await db.insert(listingEvents).values({
			id: crypto.randomUUID(),
			listingId,
			eventType: 'created',
			actorId: locals.user.id
		});

		throw redirect(303, `/listings/${listingId}`);
	}
};
