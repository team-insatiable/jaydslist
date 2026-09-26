import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
	test(`interior layouts remain usable at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/login');
		await page.fill('input[type="email"]', 'keirajd@gmail.com');
		await page.fill('input[type="password"]', 'Password01');
		await page.click('button[type="submit"]');
		await page.waitForURL('**/browse');

		for (const colorScheme of ['light', 'dark'] as const) {
			await page.emulateMedia({ colorScheme });
			for (const [route, title] of [
				['/browse', 'Someone worth a few words.'],
				['/profile', 'Your Profile'],
				['/post', 'Start with your words.'],
				['/inbox', 'Inbox'],
				['/my-listings', 'My Listings'],
				['/vault', 'My Albums']
			]) {
				await page.goto(route);
				await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
				expect(
					await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
				).toBe(true);
			}
		}

		await page.goto('/browse');
		await page.getByRole('button', { name: 'List view', exact: true }).click();
		await expect(page.getByRole('button', { name: 'List view', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await page.getByRole('button', { name: 'Card view', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Card view', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});
}
