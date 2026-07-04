import { test, expect } from '@playwright/test';

// keirockjd@gmail.com is a fake seed-script-only account (see e2e/global-setup.ts)
// — not a real mailbox, safe to use freely in tests. This account is reset to
// have zero listings before every e2e run (see global-setup.ts) so this spec
// can create one every time.
const PASSWORD = 'Password01';

test('flagged terms are highlighted, gate the flow, and appear in the published glossary', async ({
	page
}) => {
	await page.goto('/login');
	await page.fill('input[name="email"], input[type="email"]', 'keirockjd@gmail.com');
	await page.fill('input[name="password"], input[type="password"]', PASSWORD);
	await Promise.all([
		page.waitForURL((url) => !url.pathname.includes('/login')),
		page.click('button[type="submit"]')
	]);

	await page.goto('/post');

	// Step 1: identity (optional, just advance)
	await page.locator('.chip-group .chip').first().click();
	await page.click('button:has-text("Next")');

	// Step 2: nature of connection (required)
	await page.locator('.chip-group .chip').first().click();
	await page.click('button:has-text("Next")');

	// Step 3: subject + body containing a word from the default seeded vocabulary
	await page.fill('#subject', 'E2E relative terms verification listing');
	const nextBtn = page.locator('button:has-text("Next →")');
	const textarea = page.locator('textarea#body');
	await textarea.fill(
		'Looking for someone cute and down to earth, must be able to hold a conversation.'
	);

	// the word "cute" should be highlighted inline and listed as a flagged term
	await expect(page.locator('.backdrop mark')).toHaveText('cute');
	await expect(page.locator('.term-chip')).toHaveText('cute');

	// next is blocked until the flagged term is defined
	await expect(nextBtn).toBeDisabled();

	await page.locator('.term-row input[type="text"]').fill('takes care of themselves');
	await expect(nextBtn).toBeEnabled();

	await nextBtn.click();
	await page.click('button:has-text("Review →")');
	await Promise.all([
		page.waitForURL((url) => /^\/listings\/[^/]+$/.test(url.pathname)),
		page.click('button:has-text("Post listing")')
	]);

	// glossary renders the poster's definition on the published listing
	await expect(page.locator('.glossary')).toContainText('cute');
	await expect(page.locator('.glossary')).toContainText('takes care of themselves');
});
