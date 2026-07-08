import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getVaultPhotos, getAlbumList } from '$lib/server/photo-vault';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');

	const photos = await getVaultPhotos(env.DB, locals.user.id, env.CF_IMAGES_ACCOUNT_HASH);

	// Compute album covers + counts from the same photo objects to avoid a
	// separate query with a JS-filter that can silently produce wrong results.
	const albumRows = await getAlbumList(env.DB, locals.user.id);
	const coverMap: Record<string, string> = {};
	const countMap: Record<string, number> = {};
	for (const photo of photos) {
		if (photo.albumId) {
			countMap[photo.albumId] = (countMap[photo.albumId] ?? 0) + 1;
			if (!coverMap[photo.albumId]) coverMap[photo.albumId] = photo.deliveryUrl;
		}
	}
	const albums = albumRows.map((a) => ({
		id: a.id,
		name: a.name,
		coverUrl: coverMap[a.id] ?? null,
		photoCount: countMap[a.id] ?? 0
	}));

	return json({ photos, albums });
};
