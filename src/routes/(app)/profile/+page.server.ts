import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { userProfiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const VALID_IDENTITIES = ['man', 'woman', 'non_binary', 'transgender_man', 'transgender_woman', 'other'];
const VALID_PHYSICAL = ['male', 'female', 'other'];
const VALID_NATURE = ['dating', 'fwb', 'one_time', 'platonic', 'open'];
const VALID_RADII = [5, 10, 25, 50, 100];

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) throw redirect(302, '/login');

	const env = platform?.env;
	if (!env) throw new Error('Server configuration error');

	const profile = await getDb(env.DB)
		.select({
			identity: userProfiles.identity,
			physicalType: userProfiles.physicalType,
			age: userProfiles.age,
			trustTier: userProfiles.trustTier,
			responseRate: userProfiles.responseRate,
			locationSet: userProfiles.locationUpdatedAt,
			seekingIdentity: userProfiles.seekingIdentity,
			seekingPhysicalType: userProfiles.seekingPhysicalType,
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
					seekingNatureOfConnection: JSON.parse(profile.seekingNatureOfConnection ?? '[]') as string[]
				}
			: null,
		isComplete: !!(profile?.identity && profile?.physicalType && profile?.age)
	};
};

export const actions: Actions = {
	saveProfile: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');

		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const identity = data.get('identity') as string;
		const physicalType = data.get('physicalType') as string;
		const age = parseInt(data.get('age') as string);

		if (!VALID_IDENTITIES.includes(identity)) return fail(400, { error: 'Invalid identity selection' });
		if (!VALID_PHYSICAL.includes(physicalType)) return fail(400, { error: 'Invalid physical type selection' });
		if (!age || age < 18 || age > 99) return fail(400, { error: 'Age must be between 18 and 99' });

		await getDb(env.DB)
			.update(userProfiles)
			.set({ identity, physicalType, age })
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

	savePreferences: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');

		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const seekingIdentityRaw = data.getAll('seekingIdentity') as string[];
		const seekingPhysicalType = (data.get('seekingPhysicalType') as string) || null;
		const seekingNatureRaw = data.getAll('seekingNatureOfConnection') as string[];

		const seekingIdentity = seekingIdentityRaw.filter((v) => VALID_IDENTITIES.includes(v));
		const seekingNatureOfConnection = seekingNatureRaw.filter((v) => VALID_NATURE.includes(v));

		if (seekingPhysicalType && !VALID_PHYSICAL.includes(seekingPhysicalType)) {
			return fail(400, { error: 'Invalid physical type preference' });
		}

		await getDb(env.DB)
			.update(userProfiles)
			.set({
				seekingIdentity: JSON.stringify(seekingIdentity),
				seekingPhysicalType,
				seekingNatureOfConnection: JSON.stringify(seekingNatureOfConnection)
			})
			.where(eq(userProfiles.id, locals.user.id));

		return { success: true };
	}
};
