import { localPhotos, localPhotoKey } from '$lib/server/local-photos';
export class ImageStorageError extends Error {
	constructor(
		public status: number,
		public imageId?: string
	) {
		super('Image storage upload failed');
	}
}

const CF_IMAGES_BASE = 'https://api.cloudflare.com/client/v4/accounts';

export async function uploadImage(env: Env, id: string, file: File): Promise<string> {
	if (localPhotos) {
		await env.PHONE_VERIFICATION_KV.put(localPhotoKey(id), await file.arrayBuffer(), {
			metadata: { contentType: file.type }
		});
		return id;
	}
	// Allocate a Cloudflare ID first: private images cannot use custom IDs.
	const allocation = new FormData();
	allocation.append('requireSignedURLs', 'true');
	const draft = await fetch(
		`${CF_IMAGES_BASE}/${env.CF_IMAGES_ACCOUNT_ID}/images/v2/direct_upload`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.CF_IMAGES_API_TOKEN}`
			},
			body: allocation,
			signal: AbortSignal.timeout(15000)
		}
	);
	if (!draft.ok) throw new ImageStorageError(draft.status);
	const allocated = (await draft.json()) as {
		success?: boolean;
		result?: { id?: string; uploadURL?: string };
	};
	if (!allocated.success || !allocated.result?.id || !allocated.result.uploadURL)
		throw new Error('Image storage allocation failed');
	const imageId = allocated.result.id;
	try {
		const body = new FormData();
		body.append('file', file);
		const res = await fetch(allocated.result.uploadURL, {
			method: 'POST',
			body,
			signal: AbortSignal.timeout(30000)
		});
		if (!res.ok) throw new ImageStorageError(res.status, imageId);
		const data = (await res.json()) as { success?: boolean; result?: { id?: string } };
		if (!data.success || data.result?.id !== imageId) throw new ImageStorageError(502, imageId);
		return imageId;
	} catch (failure) {
		throw failure instanceof ImageStorageError ? failure : new ImageStorageError(502, imageId);
	}
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
	if (env.CF_IMAGES_SIGNING_KEY) {
		if (!env.CF_IMAGES_ACCOUNT_HASH) throw new Error('Image delivery account is not configured');
		const url = new URL(
			`https://imagedelivery.net/${encodeURIComponent(env.CF_IMAGES_ACCOUNT_HASH)}/${encodeURIComponent(id)}/jaydslistPrivateOriginal`
		);
		url.searchParams.set('exp', String(Math.floor(Date.now() / 1000) + 60));
		const encoder = new TextEncoder();
		const key = await crypto.subtle.importKey(
			'raw',
			encoder.encode(env.CF_IMAGES_SIGNING_KEY),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);
		const signature = await crypto.subtle.sign(
			'HMAC',
			key,
			encoder.encode(url.pathname + '?' + url.searchParams.toString())
		);
		url.searchParams.set(
			'sig',
			[...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
		);
		// Fetch privately on the server: the browser never receives the signed URL.
		const response = await fetch(url, {
			headers: { Accept: 'image/jpeg, image/png' },
			signal: AbortSignal.timeout(15000),
			redirect: 'manual'
		});
		if (!response.ok) throw new Error('Private image delivery failed');
		return response;
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
