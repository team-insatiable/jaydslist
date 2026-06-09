import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { userProfiles, contactMethods } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { encryptContact, decryptContact } from '$lib/server/crypto';

const VALID_IDENTITIES = ['man', 'woman', 'non_binary', 'transgender_man', 'transgender_woman', 'other'];
const VALID_PHYSICAL = ['male', 'female', 'other'];
const VALID_CONTACT_TYPES = ['phone', 'email', 'snapchat', 'instagram', 'telegram', 'signal', 'discord', 'whatsapp', 'other'];

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) throw redirect(302, '/login');

	const env = platform?.env;
	if (!env) throw new Error('Server configuration error');

	const db = getDb(env.DB);

	const profile = await db
		.select({
			identity: userProfiles.identity,
			physicalType: userProfiles.physicalType,
			age: userProfiles.age,
			trustTier: userProfiles.trustTier,
			responseRate: userProfiles.responseRate,
			createdAt: userProfiles.createdAt
		})
		.from(userProfiles)
		.where(eq(userProfiles.id, locals.user.id))
		.get();

	const contacts = await db
		.select()
		.from(contactMethods)
		.where(and(eq(contactMethods.userId, locals.user.id), eq(contactMethods.active, true)))
		.all();

	const decryptedContacts = await Promise.all(
		contacts.map(async (c) => ({
			id: c.id,
			type: c.type,
			value: await decryptContact(c.encryptedValue, env.CONTACT_ENCRYPTION_KEY),
			isDefault: c.isDefault,
			displayOrder: c.displayOrder
		}))
	);

	decryptedContacts.sort((a, b) => a.displayOrder - b.displayOrder);

	return {
		profile,
		contacts: decryptedContacts,
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

	addContact: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');

		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const type = data.get('type') as string;
		const value = (data.get('value') as string)?.trim();

		if (!VALID_CONTACT_TYPES.includes(type)) return fail(400, { error: 'Invalid contact type' });
		if (!value) return fail(400, { error: 'Contact value is required' });

		const db = getDb(env.DB);

		const existing = await db
			.select({ displayOrder: contactMethods.displayOrder })
			.from(contactMethods)
			.where(eq(contactMethods.userId, locals.user.id))
			.all();

		const isFirst = existing.length === 0;
		const maxOrder = isFirst ? 0 : Math.max(...existing.map((c) => c.displayOrder)) + 1;
		const encryptedValue = await encryptContact(value, env.CONTACT_ENCRYPTION_KEY);

		await db.insert(contactMethods).values({
			id: crypto.randomUUID(),
			userId: locals.user.id,
			type,
			encryptedValue,
			displayOrder: maxOrder,
			isDefault: isFirst
		});

		return { success: true };
	},

	removeContact: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');

		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const id = data.get('id') as string;
		if (!id) return fail(400, { error: 'Contact ID required' });

		await getDb(env.DB)
			.delete(contactMethods)
			.where(and(eq(contactMethods.id, id), eq(contactMethods.userId, locals.user.id)));

		return { success: true };
	},

	setDefault: async ({ request, locals, platform }) => {
		if (!locals.user) throw redirect(302, '/login');

		const env = platform?.env;
		if (!env) return fail(500, { error: 'Server configuration error' });

		const data = await request.formData();
		const id = data.get('id') as string;
		if (!id) return fail(400, { error: 'Contact ID required' });

		const db = getDb(env.DB);

		await db
			.update(contactMethods)
			.set({ isDefault: false })
			.where(eq(contactMethods.userId, locals.user.id));

		await db
			.update(contactMethods)
			.set({ isDefault: true })
			.where(and(eq(contactMethods.id, id), eq(contactMethods.userId, locals.user.id)));

		return { success: true };
	}
};
