import { localPhotos } from '$lib/server/local-photos';
import { screenPhoto } from '$lib/server/photo-moderation';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { photoAlbums, photoVault } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { getPhotoLimits, reservePhoto, purgeRetiredPhotos } from '$lib/server/photo-vault';
import {
	uploadImage,
	deleteImage,
	imageUrl,
	ImageStorageError
} from '$lib/server/cloudflare-images';
import { SUPPORTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from '$lib/client/photo-upload';

export const POST: RequestHandler = async ({ locals, platform, request }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');
	if (!localPhotos && (!env.REKOGNITION_ACCESS_KEY_ID || !env.REKOGNITION_SECRET_ACCESS_KEY))
		throw error(503, 'Photo uploads are unavailable until this site configures image screening.');
	if (
		!localPhotos &&
		(!env.CF_IMAGES_ACCOUNT_ID ||
			env.CF_IMAGES_ACCOUNT_ID.startsWith('YOUR_') ||
			!env.CF_IMAGES_API_TOKEN)
	)
		throw error(
			503,
			'Photo storage is not configured. The site operator needs to set the Cloudflare Images account ID and API token.'
		);
	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File) || !SUPPORTED_IMAGE_TYPES.includes(file.type))
		throw error(400, 'Please use a JPEG or PNG image');
	if (file.size > MAX_UPLOAD_BYTES || file.size === 0)
		throw error(400, 'Image must be between 1 byte and 5MB');
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
	let cfImageId = id;
	let stage: 'screening' | 'storage' | 'database' = 'screening';
	try {
		const contentRating = await screenPhoto(
			env,
			file,
			localPhotos ? String(form.get('devContentRating') ?? 'safe') : 'safe'
		);
		stage = 'storage';
		cfImageId = await uploadImage(env, id, file);
		stage = 'database';
		await db
			.update(photoVault)
			.set({ cfImageId, scanStatus: 'pending', contentRating })
			.where(eq(photoVault.id, id));
	} catch (failure) {
		console.error(
			'Photo upload failed at stage:',
			stage,
			failure instanceof ImageStorageError ? failure.status : ''
		);
		// Do not release capacity until storage confirms cleanup, even if the
		// upload response was lost after Cloudflare accepted the file.
		try {
			if (failure instanceof ImageStorageError && failure.imageId) cfImageId = failure.imageId;
			if (stage !== 'screening') {
				await db.update(photoVault).set({ cfImageId }).where(eq(photoVault.id, id));
				await deleteImage(env, cfImageId);
			}
			await db.delete(photoVault).where(eq(photoVault.id, id));
		} catch {
			console.error('Failed to clean up reserved photo', id);
		}
		if (stage === 'screening')
			throw error(502, 'Photo screening could not be completed. Please try again.');
		if (failure instanceof ImageStorageError && [401, 403].includes(failure.status))
			throw error(
				502,
				'Photo storage rejected its credentials. The site operator needs to check the Cloudflare Images API token and its account permissions.'
			);
		throw error(
			502,
			stage === 'storage'
				? 'Photo storage upload failed. Please try again.'
				: 'The uploaded photo could not be saved. Please try again.'
		);
	}
	return json({ id, cfImageId, deliveryUrl: imageUrl(env.CF_IMAGES_ACCOUNT_HASH, cfImageId) });
};
