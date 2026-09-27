import { test, expect } from '@playwright/test';

test('photo consent defaults to No and persists after changing profile preferences', async ({
	page
}) => {
	await page.goto('/login');
	await page.fill('input[type="email"]', 'keirajd@gmail.com');
	await page.fill('input[type="password"]', 'Password01');
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();
	await page.waitForURL('**/browse');
	await page.goto('/profile');
	const choice = page.locator('#preferences-nsfw');
	await expect(choice).toHaveValue('no');
	await choice.selectOption('yes');
	await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
	await expect(page.getByText('Preferences saved.', { exact: true })).toBeVisible();
	await page.reload();
	await expect(choice).toHaveValue('yes');
	await expect(page.locator('#onboarding-nsfw')).toHaveValue('yes');
	await choice.selectOption('no');
	await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
	await expect(page.getByText('Preferences saved.', { exact: true })).toBeVisible();
	await page.reload();
	await expect(choice).toHaveValue('no');
});
