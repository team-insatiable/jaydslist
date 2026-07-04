const CF_IMAGES_BASE = 'https://api.cloudflare.com/client/v4/accounts';

export async function getDirectUploadUrl(
	env: Env
): Promise<{ uploadUrl: string; id: string; deliveryUrl: string }> {
	const body = new FormData();
	body.append('requireSignedURLs', 'false');

	const res = await fetch(`${CF_IMAGES_BASE}/${env.CF_IMAGES_ACCOUNT_ID}/images/v2/direct_upload`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${env.CF_IMAGES_API_TOKEN}` },
		body
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`CF Images upload URL failed: ${res.status} ${text}`);
	}
	const data = (await res.json()) as { result: { uploadURL: string; id: string } };
	const id = data.result.id;
	return {
		uploadUrl: data.result.uploadURL,
		id,
		deliveryUrl: imageUrl(env.CF_IMAGES_ACCOUNT_HASH, id)
	};
}

export async function deleteImage(env: Env, cfImageId: string): Promise<void> {
	await fetch(`${CF_IMAGES_BASE}/${env.CF_IMAGES_ACCOUNT_ID}/images/v1/${cfImageId}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${env.CF_IMAGES_API_TOKEN}` }
	});
}

export function imageUrl(accountHash: string, cfImageId: string, variant = 'public'): string {
	return `https://imagedelivery.net/${accountHash}/${cfImageId}/${variant}`;
}
