import { test, expect } from '@playwright/test';
test('explicit ad photos stay blurred until the viewer opts in', async ({ page, browser }) => {
	await page.goto('/login');
	await page.fill('input[type="email"]', 'keirockjd@gmail.com');
	await page.fill('input[type="password"]', 'Password01');
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();
	await page.waitForURL('**/browse');
	await page.goto('/my-listings');
	for (const old of await page
		.locator('.listing-link')
		.filter({ hasText: 'Browser test for blurred ad previews' })
		.all()) {
		const path = await old.getAttribute('href');
		if (path)
			await page.request.post(`${path}?/delete`, {
				form: {},
				headers: { Origin: new URL(page.url()).origin }
			});
	}
	await page.goto('/vault/uncategorized');
	while (await page.locator('[data-photo-id]').count()) {
		const id = await page.locator('[data-photo-id]').first().getAttribute('data-photo-id');
		const tile = page.locator(`[data-photo-id="${id}"]`);
		await tile.getByRole('button', { name: 'Delete photo', exact: true }).click();
		await expect(tile).toHaveCount(0);
	}

	await page.locator('.dev-photo-controls select').selectOption('nsfw');
	const uploaded = page.waitForResponse(
		(r) => r.url().endsWith('/api/photos/upload') && r.request().method() === 'POST'
	);
	await page
		.locator('input[type="file"]')
		.first()
		.setInputFiles({
			name: 'ad-preview.png',
			mimeType: 'image/png',
			buffer: Buffer.from(
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4AAAAABJRU5ErkJggg==',
				'base64'
			)
		});
	const photo = (await (await uploaded).json()) as { id: string; cfImageId: string };
	expect(photo.id).toMatch(/^[a-f0-9-]+$/);
	const posted = await page.request.post('/post?/post', {
		form: {
			subject: 'Browser test for blurred ad previews',
			body: 'This synthetic browser test listing checks how photo preferences affect images attached to an advertisement.',
			nature: 'platonic',
			photoId: photo.id
		},
		headers: { Origin: new URL(page.url()).origin, Accept: 'application/json' },
		maxRedirects: 0
	});
	const result = (await posted.json()) as { type: string; status: number; location: string };
	expect(result.type).toBe('redirect');
	expect(result.status).toBe(303);
	const listingPath = result.location;
	expect(listingPath).toMatch(/^\/listings\/[a-f0-9-]+$/);

	const context = await browser.newContext();
	const viewer = await context.newPage();
	try {
		await viewer.goto('/login');
		await viewer.fill('input[type="email"]', 'keirajd@gmail.com');
		await viewer.fill('input[type="password"]', 'Password01');
		await viewer.getByRole('button', { name: 'Sign in', exact: true }).click();
		await viewer.waitForURL('**/browse');
		await viewer.goto(listingPath);
		const blurred = viewer.getByRole('button', { name: 'NSFW photo blurred by your preferences' });
		await expect(blurred).toBeDisabled();
		await expect(blurred.getByText('NSFW', { exact: true })).toBeVisible();
		await expect
			.poll(() => blurred.locator('img').evaluate((i) => (i as HTMLImageElement).naturalWidth))
			.toBeGreaterThan(0);
		expect((await viewer.request.get(`/api/photos/${photo.cfImageId}`)).status()).toBe(403);
		expect(
			(await viewer.request.get(`/api/photos/${photo.cfImageId}?preview=blurred`)).status()
		).toBe(200);
		await viewer.goto('/profile');
		await viewer.locator('#photo-nsfw').selectOption('yes');
		await viewer.getByRole('button', { name: 'Save photo preference', exact: true }).click();
		await expect(viewer.getByText('Photo preference saved.', { exact: true })).toBeVisible();
		await viewer.goto(listingPath);
		const clear = viewer.getByRole('button', { name: 'View photo', exact: true });
		await expect(clear).toBeEnabled();
		await expect(clear.locator('img')).toHaveAttribute('src', `/api/photos/${photo.cfImageId}`);
		expect((await viewer.request.get(`/api/photos/${photo.cfImageId}`)).status()).toBe(200);
		await clear.click();
		await expect(viewer.locator('.lightbox')).toBeVisible();
	} finally {
		await viewer.goto('/profile');
		await viewer.locator('#photo-nsfw').selectOption('no');
		await viewer.getByRole('button', { name: 'Save photo preference', exact: true }).click();
		await expect(viewer.getByText('Photo preference saved.', { exact: true })).toBeVisible();
		await page.request.post(`${listingPath}?/delete`, {
			form: {},
			headers: { Origin: new URL(page.url()).origin }
		});
		await context.close();
		await page.reload();
		await page
			.locator(`[data-photo-id="${photo.id}"]`)
			.getByRole('button', { name: 'Delete photo', exact: true })
			.click();
		await expect(page.locator(`[data-photo-id="${photo.id}"]`)).toHaveCount(0);
	}
});
