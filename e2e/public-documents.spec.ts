import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
	test(`public information pages work at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		for (const colorScheme of ['light', 'dark'] as const) {
			await page.emulateMedia({ colorScheme });
			for (const route of ['/about', '/rules', '/privacy', '/terms']) {
				await page.goto(route);
				await expect(page.locator('.document-content h1')).toBeVisible();
				const navigation = page.getByRole('navigation', { name: 'About and policies' });
				await expect(navigation.getByRole('link')).toHaveCount(4);
				await expect(navigation.locator('[aria-current="page"]')).toHaveAttribute('href', route);
				expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
					true
				);
				if (width === 1440 && (await page.locator('.document-content h2').count()) > 0) {
					const contents = page.getByRole('navigation', { name: 'On this page' });
					const link = contents.getByRole('link').first();
					const target = await link.getAttribute('href');
					await link.click();
					await expect(page.locator(target!)).toBeInViewport();
				}
			}
		}
		await page.goto('/about');
		await page
			.getByRole('navigation', { name: 'About and policies' })
			.getByRole('link', { name: 'Privacy' })
			.click();
		await expect(page).toHaveURL(/\/privacy$/);
	});
}
