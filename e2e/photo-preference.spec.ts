import { test, expect } from '@playwright/test';

test('photo consent has one control and survives saving other profile sections', async ({
	page
}) => {
	await page.goto('/login');
	await page.fill('input[type="email"]', 'keirajd@gmail.com');
	await page.fill('input[type="password"]', 'Password01');
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();
	await page.waitForURL('**/browse');
	await page.goto('/profile');
	const choice = page.locator('#photo-nsfw');
	await expect(choice).toHaveValue('no');
	await choice.selectOption('yes');
	await page.getByRole('button', { name: 'Save photo preference', exact: true }).click();
	await expect(page.getByText('Photo preference saved.', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
	await expect(page.getByText('Preferences saved.', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByText('Profile saved.', { exact: true })).toBeVisible();
	await page.reload();
	await expect(choice).toHaveValue('yes');
	await expect(page.locator('#onboarding-nsfw')).toHaveCount(0);
	await expect(page.locator('#preferences-nsfw')).toHaveCount(0);
	await choice.selectOption('no');
	await page.getByRole('button', { name: 'Save photo preference', exact: true }).click();
	await expect(page.getByText('Photo preference saved.', { exact: true })).toBeVisible();
	await page.reload();
	await expect(choice).toHaveValue('no');
});
