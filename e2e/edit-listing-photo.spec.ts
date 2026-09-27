import { test, expect } from '@playwright/test';

const listingPath = '/listings/e2e0000-0000-0000-0000-00000000b003';

// Dedicated local account/listing fixture; never touches production.
test('an existing listing can upload, show, and remove a photo', async ({ page }) => {
	await page.goto('/login');
	await page.fill('input[type="email"]', 'edit-photo@example.test');
	await page.fill('input[type="password"]', 'Password01');
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();
	await page.waitForURL('**/browse');
	await page.goto(`${listingPath}/edit`);
	await expect(page.getByRole('button', { name: 'Add photo' }).first()).toBeEnabled();

	const uploaded = page.waitForResponse(
		(response) =>
			response.url().endsWith('/api/photos/upload') && response.request().method() === 'POST'
	);
	await page.getByLabel('Upload a new photo').setInputFiles({
		name: 'edit-listing.png',
		mimeType: 'image/png',
		buffer: Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4AAAAABJRU5ErkJggg==',
			'base64'
		)
	});
	const photo = (await (await uploaded).json()) as { id: string };
	await expect(page.getByRole('button', { name: 'Remove photo' })).toBeVisible();
	await page.getByRole('button', { name: 'Save changes' }).click();
	await page.waitForURL(`**${listingPath}`);
	await expect(page.getByRole('button', { name: 'View photo' })).toHaveCount(1);

	await page.goto(`${listingPath}/edit`);
	await expect(page.getByRole('button', { name: 'Remove photo' })).toHaveCount(1);
	await page.getByRole('button', { name: 'Remove photo' }).click();
	await page.getByRole('button', { name: 'Save changes' }).click();
	await page.waitForURL(`**${listingPath}`);
	await expect(page.getByRole('button', { name: 'View photo' })).toHaveCount(0);

	await page.goto('/vault/uncategorized');
	const tile = page.locator(`[data-photo-id="${photo.id}"]`);
	await tile.getByRole('button', { name: 'Delete photo' }).click();
	await expect(tile).toHaveCount(0);
});
