import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getVaultPhotos } from '$lib/server/photo-vault';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');

	const photos = await getVaultPhotos(env.DB, locals.user.id, env.CF_IMAGES_ACCOUNT_HASH);
	return json({ photos });
};
