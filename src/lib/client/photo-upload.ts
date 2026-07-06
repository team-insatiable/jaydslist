// Cloudflare Images only accepts raster formats — SVG (a vector/XML format)
// passes a naive `startsWith('image/')` check but gets rejected by CF with
// an unfriendly 415, so it needs its own explicit allow-list.
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function uploadPhotoToVault(
	file: File,
	albumId?: string
): Promise<{ id: string; deliveryUrl: string }> {
	if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
		throw new Error('Please use a JPEG, PNG, GIF, or WebP image');
	}
	if (file.size > MAX_UPLOAD_BYTES) {
		throw new Error('Image must be under 10MB');
	}

	const urlRes = await fetch('/api/photos/upload-url', { method: 'POST' });
	if (!urlRes.ok) throw new Error('Failed to get upload URL');
	const { uploadUrl, id, deliveryUrl } = (await urlRes.json()) as {
		uploadUrl: string;
		id: string;
		deliveryUrl: string;
	};

	const form = new FormData();
	form.append('file', file);
	const uploadRes = await fetch(uploadUrl, { method: 'POST', body: form });
	if (!uploadRes.ok) throw new Error('Upload failed');

	const confirmRes = await fetch('/api/photos/confirm', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ cfImageId: id, target: 'vault', ...(albumId ? { albumId } : {}) })
	});
	if (!confirmRes.ok) {
		const errBody = (await confirmRes.json().catch(() => null)) as { message?: string } | null;
		throw new Error(errBody?.message ?? 'Could not save photo to your vault');
	}
	const { id: vaultPhotoId } = (await confirmRes.json()) as { id: string };

	return { id: vaultPhotoId, deliveryUrl };
}
