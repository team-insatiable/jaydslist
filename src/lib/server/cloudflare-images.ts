import { localPhotos, localPhotoKey } from '$lib/server/local-photos';
export class ImageStorageError extends Error {
	constructor(public status: number) {
		super('Image storage upload failed');
	}
}

const CF_IMAGES_BASE = 'https://api.cloudflare.com/client/v4/accounts';

export async function uploadImage(env: Env, id: string, file: File): Promise<void> {
	if (localPhotos) {
		await env.PHONE_VERIFICATION_KV.put(localPhotoKey(id), await file.arrayBuffer(), {
			metadata: { contentType: file.type }
		});
		return;
	}
	const body = new FormData();
	body.append('id', id);
	body.append('file', file);
	body.append('requireSignedURLs', 'true');
	const res = await fetch(`${CF_IMAGES_BASE}/${env.CF_IMAGES_ACCOUNT_ID}/images/v1`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${env.CF_IMAGES_API_TOKEN}` },
		body
	});
	if (!res.ok) throw new ImageStorageError(res.status);
	const data = (await res.json()) as { success?: boolean; result?: { id?: string } };
	if (!data.success || data.result?.id !== id) throw new Error('Image storage upload failed');
}

export async function deleteImage(env: Env, cfImageId: string): Promise<void> {
	if (localPhotos) {
		await env.PHONE_VERIFICATION_KV.delete(localPhotoKey(cfImageId));
		return;
	}
	const res = await fetch(`${CF_IMAGES_BASE}/${env.CF_IMAGES_ACCOUNT_ID}/images/v1/${cfImageId}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${env.CF_IMAGES_API_TOKEN}` }
	});
	if (!res.ok && res.status !== 404) throw new Error('Image storage deletion failed');
}

// Keep delivery behind current account preferences, including previously shared albums.
export function imageUrl(_accountHash: string, cfImageId: string, _variant = 'public'): string {
	return `/api/photos/${encodeURIComponent(cfImageId)}`;
}

export async function downloadImage(env: Env, id: string): Promise<Response> {
	if (localPhotos) {
		const photo = await env.PHONE_VERIFICATION_KV.getWithMetadata<{ contentType: string }>(
			localPhotoKey(id),
			'arrayBuffer'
		);
		if (!photo.value) throw new Error('Local photo not found');
		return new Response(photo.value, {
			headers: { 'Content-Type': photo.metadata?.contentType ?? 'application/octet-stream' }
		});
	}
	const response = await fetch(
		`${CF_IMAGES_BASE}/${env.CF_IMAGES_ACCOUNT_ID}/images/v1/${encodeURIComponent(id)}/blob`,
		{
			headers: { Authorization: `Bearer ${env.CF_IMAGES_API_TOKEN}` },
			signal: AbortSignal.timeout(15000)
		}
	);
	if (!response.ok) throw new Error('Image storage download failed');
	return response;
}

export async function makeImagePrivate(env: Env, id: string): Promise<void> {
	if (localPhotos) return;
	const response = await fetch(
		`${CF_IMAGES_BASE}/${env.CF_IMAGES_ACCOUNT_ID}/images/v1/${encodeURIComponent(id)}`,
		{
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${env.CF_IMAGES_API_TOKEN}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ requireSignedURLs: true }),
			signal: AbortSignal.timeout(15000)
		}
	);
	if (!response.ok) throw new Error('Could not protect image delivery');
	const result = (await response.json()) as { success?: boolean };
	if (!result.success) throw new Error('Could not protect image delivery');
}
