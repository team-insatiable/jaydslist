const CF_IMAGES_BASE = 'https://api.cloudflare.com/client/v4/accounts';

export async function uploadImage(env: Env, id: string, file: File): Promise<void> {
	const body = new FormData();
	body.append('id', id);
	body.append('file', file);
	body.append('requireSignedURLs', 'false');
	const res = await fetch(`${CF_IMAGES_BASE}/${env.CF_IMAGES_ACCOUNT_ID}/images/v1`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${env.CF_IMAGES_API_TOKEN}` },
		body
	});
	if (!res.ok) throw new Error('Image storage upload failed');
	const data = (await res.json()) as { success?: boolean; result?: { id?: string } };
	if (!data.success || data.result?.id !== id) throw new Error('Image storage upload failed');
}

export async function deleteImage(env: Env, cfImageId: string): Promise<void> {
	const res = await fetch(`${CF_IMAGES_BASE}/${env.CF_IMAGES_ACCOUNT_ID}/images/v1/${cfImageId}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${env.CF_IMAGES_API_TOKEN}` }
	});
	if (!res.ok && res.status !== 404) throw new Error('Image storage deletion failed');
}

export function imageUrl(accountHash: string, cfImageId: string, variant = 'public'): string {
	return `https://imagedelivery.net/${accountHash}/${cfImageId}/${variant}`;
}
