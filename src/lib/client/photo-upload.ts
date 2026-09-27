// Cloudflare Images only accepts raster formats — SVG (a vector/XML format)
// passes a naive `startsWith('image/')` check but gets rejected by CF with
// an unfriendly 415, so it needs its own explicit allow-list.
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function uploadPhotoToVault(
	file: File,
	albumId?: string,
	devContentRating = 'safe'
): Promise<{ id: string; cfImageId: string; deliveryUrl: string }> {
	if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
		throw new Error('Please use a JPEG or PNG image');
	}
	if (file.size > MAX_UPLOAD_BYTES) {
		throw new Error('Image must be under 5MB');
	}

	const form = new FormData();
	form.append('file', file);
	if (albumId) form.append('albumId', albumId);
	form.append('devContentRating', devContentRating);
	const res = await fetch('/api/photos/upload', { method: 'POST', body: form });
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as { message?: string } | null;
		throw new Error(body?.message ?? 'Photo upload failed. Try again.');
	}
	return res.json() as Promise<{ id: string; cfImageId: string; deliveryUrl: string }>;
}
