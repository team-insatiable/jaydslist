import { test, expect } from '@playwright/test';

test('profile setup selections survive date entry and page data refresh', async ({ page }) => {
	await page.goto('/login');
	await page.fill('input[type="email"]', 'keirajd@gmail.com');
	await page.fill('input[type="password"]', 'Password01');
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();
	await page.waitForURL('**/browse');
	await page.goto('/profile');
	await expect(page.locator('#photo-nsfw')).toBeEnabled();

	await page.locator('#identity').selectOption('man');
	await page.locator('#bodyType').selectOption('athletic');
	await expect(page.locator('#bodyType')).toHaveValue('athletic');
	await page.locator('#dateOfBirth').fill('1990-05-12');
	await expect(page.locator('#identity')).toHaveValue('man');
	await expect(page.locator('#bodyType')).toHaveValue('athletic');
	await expect(page.locator('#dateOfBirth')).toHaveValue('1990-05-12');

	// Saving another section refreshes profile page data. An unfinished setup form
	// must keep its draft selections until the user explicitly saves that form.
	await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
	await expect(page.getByText('Preferences saved.', { exact: true })).toBeVisible();
	await expect(page.locator('#identity')).toHaveValue('man');
	await expect(page.locator('#bodyType')).toHaveValue('athletic');
	await expect(page.locator('#dateOfBirth')).toHaveValue('1990-05-12');
});
