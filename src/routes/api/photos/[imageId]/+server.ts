import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { downloadImage, downloadBlurredImage } from '$lib/server/cloudflare-images';
import { canReceivePhoto } from '$lib/server/photo-moderation';
import { allowsNsfwInThread } from '$lib/server/thread-photo-preference';

export const GET: RequestHandler = async ({ locals, platform, params, url }) => {
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
	const blurred = url?.searchParams.get('preview') === 'blurred';
	const threadId = url?.searchParams.get('threadId');
	if (blurred && photo.content_rating !== 'nsfw') throw error(403, 'Preview unavailable');
	let allowsNsfw = photo.allow_nsfw === 1;
	if (!owner || blurred) {
		const blocked = await env.DB.prepare(
			`SELECT 1 FROM user_blocks WHERE
			(blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`
		)
			.bind(viewerId, photo.user_id, photo.user_id, viewerId)
			.first();
		if (blocked) throw error(403, 'Forbidden');
		if (threadId && !blurred) {
			const shared = await env.DB.prepare(
				`SELECT t.initiator_id, t.initiator_nsfw_choice, t.poster_nsfw_choice
				FROM messages m JOIN conversation_threads t ON t.id = m.thread_id
				WHERE t.id = ? AND m.sender_id = ? AND (t.initiator_id = ? OR t.poster_id = ?)
				AND (m.cf_image_id = ? OR (m.album_id = ? AND ? IS NULL))
				AND (m.expires_at IS NULL OR m.expires_at > unixepoch()) LIMIT 1`
			)
				.bind(
					threadId,
					photo.user_id,
					viewerId,
					viewerId,
					params.imageId,
					photo.album_id,
					photo.deleted_at
				)
				.first<{
					initiator_id: string;
					initiator_nsfw_choice: string;
					poster_nsfw_choice: string;
				}>();
			if (!shared) throw error(403, 'Forbidden');
			allowsNsfw = allowsNsfwInThread(
				allowsNsfw,
				shared.initiator_id === viewerId ? shared.initiator_nsfw_choice : shared.poster_nsfw_choice
			);
		} else {
			const listing = await env.DB.prepare(
				`SELECT 1 FROM listing_photos lp JOIN listings l ON l.id = lp.listing_id
				WHERE lp.vault_photo_id = ? AND lp.purged_at IS NULL AND l.status = 'active' AND l.expires_at > unixepoch()`
			)
				.bind(photo.id)
				.first();
			if (!listing) throw error(403, 'Forbidden');
		}
	}
	if (!blurred && !owner && !canReceivePhoto(photo.content_rating, allowsNsfw))
		throw error(403, 'This photo is hidden by your content preference or awaiting screening');
	let response: Response;
	try {
		response = blurred
			? await downloadBlurredImage(env, params.imageId)
			: await downloadImage(env, params.imageId);
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
