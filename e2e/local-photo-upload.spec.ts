import { test, expect } from '@playwright/test';

test('local vault upload displays an image and a simulated NSFW result without service credentials', async ({
	page
}) => {
	await page.goto('/login');
	await page.fill('input[type="email"]', 'keirajd@gmail.com');
	await page.fill('input[type="password"]', 'Password01');
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();
	await page.waitForURL('**/browse');
	await page.goto('/vault/uncategorized');
	await page.locator('.dev-photo-controls select').selectOption('nsfw');
	const uploaded = page.waitForResponse(
		(response) =>
			response.url().endsWith('/api/photos/upload') && response.request().method() === 'POST'
	);
	await page
		.locator('input[type="file"]')
		.first()
		.setInputFiles({
			name: 'local-test.png',
			mimeType: 'image/png',
			buffer: Buffer.from(
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4AAAAABJRU5ErkJggg==',
				'base64'
			)
		});
	const response = await uploaded;
	expect(response.status()).toBe(200);
	const photo = (await response.json()) as { id: string };
	const tile = page.locator(`[data-photo-id="${photo.id}"]`);
	await expect(tile.getByText('NSFW · opt-in required')).toBeVisible();
	await expect(tile.locator('img')).toBeVisible();
	await expect
		.poll(() => tile.locator('img').evaluate((image) => (image as HTMLImageElement).naturalWidth))
		.toBeGreaterThan(0);
	await page.reload();
	await expect(tile.locator('img')).toBeVisible();
	await tile.getByRole('button', { name: 'Delete photo', exact: true }).click();
	await expect(tile).toHaveCount(0);
});
