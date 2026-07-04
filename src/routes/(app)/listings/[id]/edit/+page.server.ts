import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import {
	listings,
	listingRequirements,
	relativeTermDefinitions,
	listingEvents,
	moderationActions
} from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getActiveVocabulary } from '$lib/server/relative-terms.server';
import { scanTerms } from '$lib/relative-terms';

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

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	if (!locals.user) throw redirect(302, '/login');

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
			availability: listings.availability,
			ageRangeMin: listings.ageRangeMin,
			ageRangeMax: listings.ageRangeMax
		})
		.from(listings)
		.where(eq(listings.id, params.id))
		.get();

	if (!listing) throw error(404, 'Listing not found');
	if (listing.userId !== locals.user.id) throw error(403, 'Forbidden');
	if (listing.status === 'removed') throw error(410, 'This listing has been removed');

	const [reqs, termDefs] = await Promise.all([
		db.select().from(listingRequirements).where(eq(listingRequirements.listingId, params.id)).all(),
		db
			.select()
			.from(relativeTermDefinitions)
			.where(eq(relativeTermDefinitions.listingId, params.id))
			.all()
	]);

	let suspensionReason: string | null = null;
	if (listing.status === 'flagged') {
		const action = await db
			.select({ reason: moderationActions.reason })
			.from(moderationActions)
			.where(
				and(eq(moderationActions.targetId, params.id), eq(moderationActions.actionType, 'restrict'))
			)
			.orderBy(desc(moderationActions.createdAt))
			.get();
		suspensionReason = action?.reason ?? null;
	}

	const hardReqs = reqs.filter((r) => r.type === 'hard');
	const softReqs = reqs.filter((r) => r.type === 'soft');
	const vocabulary = await getActiveVocabulary(env.DB);

	return {
		listing: {
			id: listing.id,
			subject: listing.subject,
			body: listing.body,
			status: listing.status,
			lookingForIdentity: JSON.parse(listing.lookingForIdentity) as string[],
			natureOfConnection: JSON.parse(listing.natureOfConnection) as string[],
			mood: listing.mood,
			availability: listing.availability,
			ageRangeMin: listing.ageRangeMin,
			ageRangeMax: listing.ageRangeMax
		},
		suspensionReason,
		requirements: {
			ageMin: hardReqs.find((r) => r.field === 'age_min')?.value ?? null,
			ageMax: hardReqs.find((r) => r.field === 'age_max')?.value ?? null,
			trustTierMin: hardReqs.find((r) => r.field === 'trust_tier')?.value ?? 'new',
			softPrompts: softReqs.map((r) => r.promptText).filter(Boolean) as string[]
		},
		termDefinitions: termDefs.map((t) => ({ term: t.term, definition: t.definition })),
		vocabulary
	};
};

export const actions: Actions = {
	save: async ({ params, request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');

		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const db = getDb(env.DB);

		const listing = await db
			.select({ id: listings.id, userId: listings.userId, status: listings.status })
			.from(listings)
			.where(eq(listings.id, params.id))
			.get();

		if (!listing) return fail(404, { error: 'Listing not found' });
		if (listing.userId !== locals.user.id) return fail(403, { error: 'Forbidden' });
		if (listing.status === 'removed') return fail(410, { error: 'Listing has been removed' });

		const data = await request.formData();

		const lookingFor = (data.getAll('lookingFor') as string[]).filter((v) =>
			VALID_IDENTITIES.includes(v)
		);
		const nature = (data.getAll('nature') as string[]).filter((v) => VALID_NATURE.includes(v));
		const mood = (data.get('mood') as string) || null;
		const availability = (data.get('availability') as string) || null;
		const subject = ((data.get('subject') as string) || '').trim();
		const body = ((data.get('body') as string) || '').trim();
		const termKeys = data.getAll('termKey') as string[];
		const termValues = data.getAll('termValue') as string[];
		const termDefs = termKeys
			.map((k, i) => ({ term: k.trim().toLowerCase(), definition: (termValues[i] ?? '').trim() }))
			.filter((t) => t.term && t.definition);
		const trustTierMin = (data.get('trustTierMin') as string) || 'new';
		const softReqsRaw = data.getAll('softReq') as string[];
		const ageMinRaw = (data.get('ageMin') as string) || '';
		const ageMaxRaw = (data.get('ageMax') as string) || '';

		if (nature.length === 0)
			return fail(400, { error: 'Select at least one nature of connection' });
		if (mood && !VALID_MOODS.includes(mood)) return fail(400, { error: 'Invalid mood' });
		if (availability && !VALID_AVAILABILITY.includes(availability))
			return fail(400, { error: 'Invalid availability' });
		if (!subject || subject.length < 10)
			return fail(400, { error: 'Subject must be at least 10 characters' });
		if (subject.length > 120) return fail(400, { error: 'Subject must be 120 characters or less' });
		if (!body || body.length < 50)
			return fail(400, { error: 'Body must be at least 50 characters' });
		if (!VALID_TRUST_TIERS.includes(trustTierMin))
			return fail(400, { error: 'Invalid trust tier' });

		const ageMin = ageMinRaw ? parseInt(ageMinRaw) : null;
		const ageMax = ageMaxRaw ? parseInt(ageMaxRaw) : null;
		if (ageMin !== null && (isNaN(ageMin) || ageMin < 18 || ageMin > 99))
			return fail(400, { error: 'Invalid minimum age' });
		if (ageMax !== null && (isNaN(ageMax) || ageMax < 18 || ageMax > 99))
			return fail(400, { error: 'Invalid maximum age' });
		if (ageMin !== null && ageMax !== null && ageMin > ageMax)
			return fail(400, { error: 'Minimum age cannot exceed maximum age' });

		// Re-scan server-side so a client bypass (raw POST, disabled JS, tampered
		// hidden inputs) can't publish a listing with flagged-but-undefined terms.
		const vocabulary = await getActiveVocabulary(env.DB);
		const definedTerms = new Set(termDefs.map((t) => t.term));
		const missingDefs = scanTerms(body, vocabulary).filter((t) => !definedTerms.has(t));
		if (missingDefs.length > 0) {
			return fail(400, {
				error: `Please define the following flagged terms before saving: ${missingDefs.join(', ')}`
			});
		}

		const statusUpdate = listing.status === 'flagged' ? { status: 'active' as const } : {};

		await db
			.update(listings)
			.set({
				subject,
				body,
				lookingForIdentity: JSON.stringify(lookingFor),
				natureOfConnection: JSON.stringify(nature),
				mood,
				availability,
				ageRangeMin: ageMin,
				ageRangeMax: ageMax,
				...statusUpdate
			})
			.where(and(eq(listings.id, params.id), eq(listings.userId, locals.user.id)));

		// Replace requirements
		await db.delete(listingRequirements).where(eq(listingRequirements.listingId, params.id));

		const reqs: {
			id: string;
			listingId: string;
			type: string;
			field: string;
			value: string;
			promptText?: string;
		}[] = [];
		if (ageMin !== null)
			reqs.push({
				id: crypto.randomUUID(),
				listingId: params.id,
				type: 'hard',
				field: 'age_min',
				value: String(ageMin)
			});
		if (ageMax !== null)
			reqs.push({
				id: crypto.randomUUID(),
				listingId: params.id,
				type: 'hard',
				field: 'age_max',
				value: String(ageMax)
			});
		if (trustTierMin !== 'new')
			reqs.push({
				id: crypto.randomUUID(),
				listingId: params.id,
				type: 'hard',
				field: 'trust_tier',
				value: trustTierMin
			});
		for (const prompt of softReqsRaw) {
			const trimmed = prompt.trim();
			if (trimmed)
				reqs.push({
					id: crypto.randomUUID(),
					listingId: params.id,
					type: 'soft',
					field: 'prompt',
					value: 'acknowledged',
					promptText: trimmed
				});
		}
		if (reqs.length > 0) await db.insert(listingRequirements).values(reqs);

		// Replace term definitions
		await db
			.delete(relativeTermDefinitions)
			.where(eq(relativeTermDefinitions.listingId, params.id));
		if (termDefs.length > 0) {
			await db.insert(relativeTermDefinitions).values(
				termDefs.map((t) => ({
					id: crypto.randomUUID(),
					listingId: params.id,
					term: t.term,
					definition: t.definition
				}))
			);
		}

		await db.insert(listingEvents).values({
			id: crypto.randomUUID(),
			listingId: params.id,
			eventType: 'edited',
			actorId: locals.user.id
		});

		throw redirect(303, `/listings/${params.id}`);
	}
};
