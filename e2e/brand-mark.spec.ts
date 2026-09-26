import { test, expect } from '@playwright/test';

test('public and account pages load the shared vector mark without overflow', async ({ page }) => {
	for (const width of [390, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		for (const route of ['/', '/about', '/login', '/register', '/forgot-password']) {
			await page.goto(route);
			const mark = page.locator('img.brand-mark').first();
			await expect(mark).toBeVisible();
			await expect(mark).toHaveJSProperty('complete', true);
			expect(await mark.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(
				0
			);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
			await expect(page.locator('link[rel="icon"]')).toHaveCount(1);
		}
	}
});
