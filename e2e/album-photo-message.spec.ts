import { test, expect } from '@playwright/test';

const threadPath = '/inbox/e2e0000-0000-0000-0000-00000000c003';
const albumName = 'Message photo test';
const image = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==',
	'base64'
);

test('a photo in an album can be sent alone without a second upload', async ({ page }) => {
	await page.goto('/login');
	await page.fill('input[type="email"]', 'edit-photo@example.test');
	await page.fill('input[type="password"]', 'Password01');
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();
	await page.waitForURL('**/browse');

	let vault = (await (await page.request.get('/api/photos/vault')).json()) as {
		albums: { id: string; name: string }[];
		photos: { id: string; cfImageId: string }[];
	};
	let album = vault.albums.find((item) => item.name === albumName);
	if (!album) {
		const created = await page.request.post('/vault?/createAlbum', {
			form: { name: albumName }
		});
		expect(created.ok()).toBeTruthy();
		vault = await (await page.request.get('/api/photos/vault')).json();
		album = vault.albums.find((item) => item.name === albumName);
	}
	expect(album).toBeDefined();
	const upload = await page.request.post('/api/photos/upload', {
		multipart: {
			albumId: album!.id,
			file: { name: 'album-message.png', mimeType: 'image/png', buffer: image }
		}
	});
	expect(upload.status()).toBe(200);
	const photo = (await upload.json()) as { id: string; cfImageId: string };

	const presence = page.waitForResponse((response) => response.url().includes('/presence'));
	await page.goto(threadPath);
	await presence;
	await page.getByRole('button', { name: 'Add photo' }).click();
	await expect(page.getByRole('button', { name: `Select album ${albumName}` })).toBeVisible();
	await expect(page.getByRole('button', { name: `Select photo from ${albumName}` })).toBeVisible();

	// A repeated upload gives a useful message and leaves the original available.
	await page.locator('#media-gallery-input').setInputFiles({
		name: 'second-name.png',
		mimeType: 'image/png',
		buffer: image
	});
	await expect(
		page.getByText('This photo is already in your vault. Select the existing photo instead.')
	).toBeVisible();
	await expect(page.getByRole('button', { name: `Select photo from ${albumName}` })).toHaveCount(1);

	let subsequentUploads = 0;
	page.on('request', (request) => {
		if (request.method() === 'POST' && request.url().endsWith('/api/photos/upload'))
			subsequentUploads++;
	});
	await page.getByRole('button', { name: `Select photo from ${albumName}` }).click();
	await expect(page.locator('input[name="cfImageId"]')).toHaveValue(photo.cfImageId);
	await expect(page.locator('input[name="albumId"]')).toHaveCount(0);
	await page.getByRole('button', { name: 'Send (1)' }).click();
	await expect(page.getByRole('button', { name: 'View photo' })).toHaveCount(1);
	await expect(page.getByRole('button', { name: 'View shared album' })).toHaveCount(0);
	expect(subsequentUploads).toBe(0);

	await page.goto(`/vault/${album!.id}`);
	const tile = page.locator(`[data-photo-id="${photo.id}"]`);
	await tile.getByRole('button', { name: 'Delete photo' }).click();
	await expect(tile).toHaveCount(0);
	const deleted = await page.request.post('/vault?/deleteAlbum', {
		form: { id: album!.id }
	});
	expect(deleted.ok()).toBeTruthy();
});
