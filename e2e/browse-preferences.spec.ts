import { test, expect, type Page } from '@playwright/test';

// Existing synthetic seed account; never authenticates against production.
async function login(page: Page) {
	await page.goto('/login');
	await page.fill('input[type="email"]', 'keirockjd@gmail.com');
	await page.fill('input[type="password"]', 'Password01');
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();
	await page.waitForURL('**/browse');
}
async function saved(page: Page) {
	await expect(page.locator('.preference-status')).toHaveText(
		'Filters are remembered for your account.'
	);
}

test('browse filters survive logout, a fresh browser, and switching back to all connections', async ({
	page,
	browser
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await login(page);
	await page.getByRole('combobox', { name: 'Nature of connection' }).selectOption('dating');
	await page.getByRole('combobox', { name: 'Radius' }).selectOption('50');
	await page.getByRole('combobox', { name: 'Nature of connection' }).selectOption('fwb');
	await page.getByRole('button', { name: 'List view', exact: true }).click();
	await saved(page);
	await expect(page.getByRole('combobox', { name: 'Nature of connection' })).toHaveValue('fwb');
	await expect(page.getByRole('combobox', { name: 'Radius' })).toHaveValue('50');

	await expect(page.getByRole('button', { name: 'List view', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);

	const signoutStatus = await page.evaluate(async () => {
		const response = await fetch('/api/auth/sign-out', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: '{}'
		});
		return response.status;
	});
	expect(signoutStatus).toBe(200);
	await page.goto('/browse');
	await page.waitForURL('**/login');
	await login(page);
	await expect(page.getByRole('combobox', { name: 'Nature of connection' })).toHaveValue('fwb');
	await expect(page.getByRole('combobox', { name: 'Radius' })).toHaveValue('50');
	await expect(page.getByRole('button', { name: 'List view', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);

	const freshContext = await browser.newContext();
	try {
		const freshPage = await freshContext.newPage();
		await login(freshPage);
		await expect(freshPage.getByRole('combobox', { name: 'Nature of connection' })).toHaveValue(
			'fwb'
		);
		await expect(freshPage.getByRole('combobox', { name: 'Radius' })).toHaveValue('50');
		await expect(freshPage.getByRole('button', { name: 'List view', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await freshPage.getByRole('combobox', { name: 'Nature of connection' }).selectOption('all');
		await freshPage.getByRole('combobox', { name: 'Radius' }).selectOption('25');
		await freshPage.getByRole('button', { name: 'Card view', exact: true }).click();
		await saved(freshPage);
		await freshPage.goto('/browse');
		await expect(freshPage.getByRole('combobox', { name: 'Nature of connection' })).toHaveValue(
			'all'
		);
		await expect(freshPage.getByRole('combobox', { name: 'Radius' })).toHaveValue('25');
		await expect(freshPage.getByRole('button', { name: 'Card view', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	} finally {
		await freshContext.close();
	}
});

test('shows a failed save and keeps the previous account preference', async ({ page }) => {
	await login(page);
	const radius = page.getByRole('combobox', { name: 'Radius' });
	await expect(radius).toBeEnabled();
	const original = await radius.inputValue();
	const saveRequest = (url: URL) =>
		url.pathname === '/browse' && url.search.includes('/savePreference');
	await page.route(saveRequest, async (route) => {
		if (route.request().method() === 'POST') await route.abort();
		else await route.continue();
	});
	await radius.selectOption(original === '100' ? '50' : '100');
	await expect(page.locator('.preference-status')).toHaveText(
		'Could not save your search preferences. Please try again.'
	);
	await page.unroute(saveRequest);
	await page.goto('/browse');
	await expect(radius).toHaveValue(original);
});
