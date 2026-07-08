import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { conversationThreads, messages, photoAlbums } from '$lib/server/db/schema';
import { eq, or } from 'drizzle-orm';
import { getAlbumPhotos } from '$lib/server/photo-vault';

export const GET: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');

	const db = getDb(env.DB);
	const albumId = params.albumId;

	// Allow access if user owns the album OR is a participant in a thread where it was shared
	const album = await db
		.select({ userId: photoAlbums.userId, name: photoAlbums.name })
		.from(photoAlbums)
		.where(eq(photoAlbums.id, albumId))
		.get();

	if (!album) throw error(404, 'Album not found');

	const isOwner = album.userId === locals.user.id;

	if (!isOwner) {
		const sharedMsg = await db
			.select({ id: messages.id })
			.from(messages)
			.innerJoin(conversationThreads, eq(messages.threadId, conversationThreads.id))
			.where(
				or(
					eq(conversationThreads.initiatorId, locals.user.id),
					eq(conversationThreads.posterId, locals.user.id)
				)
			)
			.get();
		if (!sharedMsg) throw error(403, 'Forbidden');
	}

	const photos = await getAlbumPhotos(env.DB, albumId, env.CF_IMAGES_ACCOUNT_HASH);
	return json({ name: album.name, photos });
};
