import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { photoAlbums, photoVault } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { getPhotoLimits, reservePhoto, purgeRetiredPhotos } from '$lib/server/photo-vault';
import { uploadImage, deleteImage, imageUrl } from '$lib/server/cloudflare-images';
import { SUPPORTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from '$lib/client/photo-upload';

export const POST: RequestHandler = async ({ locals, platform, request }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');
	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File) || !SUPPORTED_IMAGE_TYPES.includes(file.type))
		throw error(400, 'Please use a JPEG, PNG, GIF, or WebP image');
	if (file.size > MAX_UPLOAD_BYTES || file.size === 0)
		throw error(400, 'Image must be between 1 byte and 10MB');
	const albumId =
		typeof form.get('albumId') === 'string' ? String(form.get('albumId')) || null : null;
	const db = getDb(env.DB);
	if (albumId) {
		const album = await db
			.select({ id: photoAlbums.id })
			.from(photoAlbums)
			.where(and(eq(photoAlbums.id, albumId), eq(photoAlbums.userId, locals.user.id)))
			.get();
		if (!album) throw error(404, 'Album not found');
	}
	const { maxPhotos } = await getPhotoLimits(env, locals.user.id);
	await purgeRetiredPhotos(env, locals.user.id);
	const id = crypto.randomUUID();
	const reservation = await reservePhoto(env.DB, locals.user.id, id, albumId, maxPhotos);
	if (!reservation.meta.changes)
		throw error(
			400,
			`Your account allows ${maxPhotos} photos total. Delete a photo before uploading another. Photos retained by listings also count.`
		);
	try {
		await uploadImage(env, id, file);
		await db.update(photoVault).set({ scanStatus: 'pending' }).where(eq(photoVault.id, id));
	} catch {
		// Do not release capacity until storage confirms cleanup, even if the
		// upload response was lost after Cloudflare accepted the file.
		try {
			await deleteImage(env, id);
			await db.delete(photoVault).where(eq(photoVault.id, id));
		} catch {
			console.error('Failed to clean up reserved photo', id);
		}
		throw error(502, 'Photo upload failed. Try again.');
	}
	return json({ id, cfImageId: id, deliveryUrl: imageUrl(env.CF_IMAGES_ACCOUNT_HASH, id) });
};
