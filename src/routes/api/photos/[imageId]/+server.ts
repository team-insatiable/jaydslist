import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { downloadImage } from '$lib/server/cloudflare-images';
import { canReceivePhoto } from '$lib/server/photo-moderation';

export const GET: RequestHandler = async ({ locals, platform, params }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');
	const viewerId = locals.user.id;
	const photo = await env.DB.prepare(
		`SELECT p.*, u.allow_nsfw FROM photo_vault p
		LEFT JOIN user_profiles u ON u.id = ? WHERE p.cf_image_id = ? AND p.scan_status != 'uploading'`
	)
		.bind(viewerId, params.imageId)
		.first<{
			user_id: string;
			content_rating: string;
			allow_nsfw: number;
			deleted_at: number | null;
			album_id: string | null;
			id: string;
		}>();
	if (!photo) throw error(404, 'Photo not found');
	const owner = photo.user_id === viewerId;
	if (!owner && !canReceivePhoto(photo.content_rating, photo.allow_nsfw === 1))
		throw error(403, 'This photo is hidden by your content preference or awaiting screening');
	if (!owner) {
		const blocked = await env.DB.prepare(
			`SELECT 1 FROM user_blocks WHERE
			(blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`
		)
			.bind(viewerId, photo.user_id, photo.user_id, viewerId)
			.first();
		if (blocked) throw error(403, 'Forbidden');
		const listing = await env.DB.prepare(
			`SELECT 1 FROM listing_photos lp JOIN listings l ON l.id = lp.listing_id
			WHERE lp.vault_photo_id = ? AND lp.purged_at IS NULL AND l.status = 'active' AND l.expires_at > unixepoch()`
		)
			.bind(photo.id)
			.first();
		const shared = await env.DB.prepare(
			`SELECT 1 FROM messages m JOIN conversation_threads t ON t.id = m.thread_id
			WHERE m.sender_id = ? AND (t.initiator_id = ? OR t.poster_id = ?)
			AND (m.cf_image_id = ? OR (m.album_id = ? AND ? IS NULL))
			AND (m.expires_at IS NULL OR m.expires_at > unixepoch())`
		)
			.bind(photo.user_id, viewerId, viewerId, params.imageId, photo.album_id, photo.deleted_at)
			.first();
		if (!listing && !shared) throw error(403, 'Forbidden');
	}
	let response: Response;
	try {
		response = await downloadImage(env, params.imageId);
	} catch {
		throw error(502, 'Photo could not be loaded');
	}
	const contentType = response.headers.get('content-type') ?? '';
	if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(contentType.split(';')[0]))
		throw error(502, 'Invalid image response');
	return new Response(response.body, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'private, no-store',
			'X-Content-Type-Options': 'nosniff',
			'Content-Security-Policy': "default-src 'none'"
		}
	});
};
