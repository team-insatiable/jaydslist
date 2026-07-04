import { test, expect } from '@playwright/test';

// keirockjd@gmail.com is a fake seed-script-only account (see e2e/global-setup.ts)
// — not a real mailbox, safe to use freely in tests.
const PASSWORD = 'Password01';

test('an anonymous visitor sees the landing page instead of being redirected to login', async ({
	page
}) => {
	await page.goto('/');

	expect(page.url()).toMatch(/\/$/);
	await expect(page.getByRole('heading', { name: 'Jaydslist', exact: true })).toBeVisible();
	await expect(page.locator('.site-header a', { hasText: 'Sign in' })).toBeVisible();
	await expect(page.locator('.site-header a', { hasText: 'Create account' })).toBeVisible();

	await Promise.all([
		page.waitForURL((url) => url.pathname === '/login'),
		page.locator('.site-header a', { hasText: 'Sign in' }).click()
	]);
});

test('a logged-in visitor to / is redirected straight to /browse', async ({ page }) => {
	await page.goto('/login');
	await page.fill('input[name="email"], input[type="email"]', 'keirajd@gmail.com');
	await page.fill('input[name="password"], input[type="password"]', PASSWORD);
	await Promise.all([
		page.waitForURL((url) => !url.pathname.includes('/login')),
		page.click('button[type="submit"]')
	]);

	await page.goto('/');
	await page.waitForURL((url) => url.pathname === '/browse');
});
