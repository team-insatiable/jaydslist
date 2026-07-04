import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { photoVault, userProfiles, DEFAULT_CONFIG } from '$lib/server/db/schema';
import { eq, and, isNull, count } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');

	const body = (await request.json()) as { cfImageId: string; target: 'vault'; albumId?: string };
	const { cfImageId, target, albumId } = body;

	if (!cfImageId || typeof cfImageId !== 'string') throw error(400, 'Missing cfImageId');

	const db = getDb(env.DB);

	if (target === 'vault') {
		const profile = await db
			.select({ isSupporter: userProfiles.isSupporter })
			.from(userProfiles)
			.where(eq(userProfiles.id, locals.user.id))
			.get();

		if (!profile?.isSupporter) throw error(403, 'Photo vault requires a supporter account');

		const [existing] = await db
			.select({ total: count() })
			.from(photoVault)
			.where(and(eq(photoVault.userId, locals.user.id), isNull(photoVault.deletedAt)));

		const max = parseInt(DEFAULT_CONFIG.VAULT_MAX_PHOTOS_PAID);
		if (existing.total >= max) throw error(400, `Vault limit of ${max} photos reached`);

		const id = crypto.randomUUID();
		await db.insert(photoVault).values({
			id,
			userId: locals.user.id,
			cfImageId,
			albumId: albumId ?? null,
			scanStatus: 'pending'
		});

		return json({ id });
	}

	throw error(400, 'Invalid target');
};
