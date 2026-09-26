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
	const landingPage = page.locator('main');
	await expect(landingPage.getByRole('link', { name: 'Sign in' })).toBeVisible();
	await expect(landingPage.getByRole('link', { name: 'Create free account' })).toBeVisible();

	await Promise.all([
		page.waitForURL((url) => url.pathname === '/login'),
		landingPage.getByRole('link', { name: 'Sign in' }).click()
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

test('the landing page has a single set of account actions and a two-state color-mode toggle', async ({
	page
}) => {
	await page.goto('/');
	await page.evaluate(() => localStorage.removeItem('jaydslist-color-scheme'));
	await page.reload();

	await expect(page.locator('header.site-header')).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(1);

	const colorModeButton = page.locator('.color-mode-toggle');
	await expect(colorModeButton).toHaveAttribute('data-hydrated', 'true');
	const systemIsDark = await page.evaluate(
		() => matchMedia('(prefers-color-scheme: dark)').matches
	);
	const override = systemIsDark ? 'light' : 'dark';
	await colorModeButton.click();
	await expect(page.locator('html')).toHaveAttribute('data-color-scheme', override);

	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-color-scheme', override);

	await expect(colorModeButton).toHaveAttribute('data-hydrated', 'true');
	await colorModeButton.click();
	await expect(page.locator('html')).not.toHaveAttribute('data-color-scheme');

	await Promise.all([
		page.waitForURL((url) => url.pathname === '/self-host'),
		page.getByRole('contentinfo').getByRole('link', { name: 'Self-host' }).click()
	]);
	await expect(page.getByRole('heading', { name: 'Run your own Jaydslist' })).toBeVisible();
});
