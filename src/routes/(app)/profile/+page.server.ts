import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { userProfiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const VALID_IDENTITIES = [
	'man',
	'woman',
	'non_binary',
	'transgender_man',
	'transgender_woman',
	'other',
	'couple'
];
const VALID_COUPLE_COMPOSITIONS = ['mf', 'mm', 'ff', 'other'];
const VALID_BODY_TYPES = [
	'slim',
	'athletic',
	'average',
	'curvy',
	'stocky',
	'muscular',
	'plus_size',
	'extra_padding'
];
const VALID_NATURE = ['dating', 'fwb', 'one_time', 'platonic', 'open'];
const VALID_RADII = [5, 10, 25, 50, 100];

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) throw redirect(302, '/login');

	const env = platform?.env;
	if (!env) throw new Error('Server configuration error');

	const db = getDb(env.DB);
	const profile = await db
		.select({
			identity: userProfiles.identity,
			bodyType: userProfiles.bodyType,
			coupleComposition: userProfiles.coupleComposition,
			dateOfBirth: userProfiles.dateOfBirth,
			age: userProfiles.age,
			alias: userProfiles.alias,
			trustTier: userProfiles.trustTier,
			responseRate: userProfiles.responseRate,
			isSupporter: userProfiles.isSupporter,
			privacyMode: userProfiles.privacyMode,
			locationSet: userProfiles.locationUpdatedAt,
			seekingIdentity: userProfiles.seekingIdentity,
			seekingBodyType: userProfiles.seekingBodyType,
			seekingNatureOfConnection: userProfiles.seekingNatureOfConnection,
			browseRadius: userProfiles.browseRadius
		})
		.from(userProfiles)
		.where(eq(userProfiles.id, locals.user.id))
		.get();

	return {
		profile: profile
			? {
					...profile,
					locationSet: !!profile.locationSet,
					seekingIdentity: JSON.parse(profile.seekingIdentity ?? '[]') as string[],
					seekingBodyType: JSON.parse(profile.seekingBodyType ?? '[]') as string[],
					seekingNatureOfConnection: JSON.parse(
						profile.seekingNatureOfConnection ?? '[]'
					) as string[],
					dateOfBirthValue: profile.dateOfBirth
						? profile.dateOfBirth.toISOString().slice(0, 10)
						: null,
					coupleComposition: profile.coupleComposition ?? null,
					alias: profile.alias ?? '',
					privacyMode: profile.privacyMode ?? false
				}
			: null,
		isComplete: !!(profile?.identity && profile?.dateOfBirth)
	};
};

export const actions: Actions = {
	saveProfile: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');

		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const identity = data.get('identity') as string;
		const bodyType = identity === 'couple' ? null : (data.get('bodyType') as string) || null;
		const coupleCompositionRaw = (data.get('coupleComposition') as string) || null;
		const dobRaw = data.get('dateOfBirth') as string;

		if (!VALID_IDENTITIES.includes(identity))
			return fail(400, { error: 'Invalid identity selection' });
		if (identity === 'couple') {
			if (!coupleCompositionRaw || !VALID_COUPLE_COMPOSITIONS.includes(coupleCompositionRaw))
				return fail(400, { error: 'Please select your couple composition' });
		}
		const coupleComposition = identity === 'couple' ? coupleCompositionRaw : null;
		if (bodyType && !VALID_BODY_TYPES.includes(bodyType))
			return fail(400, { error: 'Invalid body type selection' });
		if (!dobRaw || !/^\d{4}-\d{2}-\d{2}$/.test(dobRaw))
			return fail(400, { error: 'Date of birth is required' });

		const dateOfBirth = new Date(dobRaw + 'T00:00:00Z');
		if (isNaN(dateOfBirth.getTime())) return fail(400, { error: 'Invalid date of birth' });

		const today = new Date();
		let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();
		const monthDiff = today.getUTCMonth() - dateOfBirth.getUTCMonth();
		if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < dateOfBirth.getUTCDate())) age--;

		if (age < 18) return fail(400, { error: 'You must be at least 18 years old' });
		if (age > 120) return fail(400, { error: 'Invalid date of birth' });

		await getDb(env.DB)
			.update(userProfiles)
			.set({ identity, bodyType, coupleComposition, dateOfBirth, age })
			.where(eq(userProfiles.id, locals.user.id));

		return { success: true };
	},

	saveLocation: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');

		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const lat = parseFloat(data.get('lat') as string);
		const lng = parseFloat(data.get('lng') as string);
		const radius = parseInt(data.get('radius') as string);

		if (!isFinite(lat) || lat < -90 || lat > 90) return fail(400, { error: 'Invalid latitude' });
		if (!isFinite(lng) || lng < -180 || lng > 180) return fail(400, { error: 'Invalid longitude' });
		if (!VALID_RADII.includes(radius)) return fail(400, { error: 'Invalid radius' });

		await getDb(env.DB)
			.update(userProfiles)
			.set({ lat, lng, browseRadius: radius, locationUpdatedAt: new Date() })
			.where(eq(userProfiles.id, locals.user.id));

		return { success: true };
	},

	saveRadius: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');

		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const radius = parseInt(data.get('radius') as string);

		if (!VALID_RADII.includes(radius)) return fail(400, { error: 'Invalid radius' });

		await getDb(env.DB)
			.update(userProfiles)
			.set({ browseRadius: radius })
			.where(eq(userProfiles.id, locals.user.id));

		return { success: true };
	},

	saveAlias: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');

		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const alias = (data.get('alias') as string)?.trim() ?? '';

		if (alias.length > 30) return fail(400, { error: 'Alias must be 30 characters or less' });
		if (alias && !/^[\w\s\-_.]+$/.test(alias))
			return fail(400, {
				error: 'Alias can only contain letters, numbers, spaces, hyphens, underscores, and dots'
			});

		await getDb(env.DB)
			.update(userProfiles)
			.set({ alias: alias || null })
			.where(eq(userProfiles.id, locals.user.id));

		return { success: true };
	},

	savePrivacyMode: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');

		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const profile = await getDb(env.DB)
			.select({ isSupporter: userProfiles.isSupporter })
			.from(userProfiles)
			.where(eq(userProfiles.id, locals.user.id))
			.get();

		if (!profile?.isSupporter) return fail(403, { error: 'Privacy mode is a supporter feature' });

		const data = await request.formData();
		const privacyMode = data.get('privacyMode') === 'true';

		await getDb(env.DB)
			.update(userProfiles)
			.set({ privacyMode })
			.where(eq(userProfiles.id, locals.user.id));

		return { success: true };
	},

	savePreferences: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');

		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const seekingIdentityRaw = data.getAll('seekingIdentity') as string[];
		const seekingBodyTypeRaw = data.getAll('seekingBodyType') as string[];
		const seekingNatureRaw = data.getAll('seekingNatureOfConnection') as string[];

		const seekingIdentity = seekingIdentityRaw.filter((v) => VALID_IDENTITIES.includes(v));
		const seekingBodyType = seekingBodyTypeRaw.filter((v) => VALID_BODY_TYPES.includes(v));
		const seekingNatureOfConnection = seekingNatureRaw.filter((v) => VALID_NATURE.includes(v));

		await getDb(env.DB)
			.update(userProfiles)
			.set({
				seekingIdentity: JSON.stringify(seekingIdentity),
				seekingBodyType: JSON.stringify(seekingBodyType),
				seekingNatureOfConnection: JSON.stringify(seekingNatureOfConnection)
			})
			.where(eq(userProfiles.id, locals.user.id));

		return { success: true };
	}
};
