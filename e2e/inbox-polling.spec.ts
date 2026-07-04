import { test, expect, type Page } from '@playwright/test';

// keirockjd@gmail.com / keirajd@gmail.com are fake seed-script-only accounts
// (see scripts/seed.sh) — not real mailboxes, safe to use freely in tests.
const PASSWORD = 'Password01';

async function login(page: Page, email: string) {
	await page.goto('/login');
	await page.fill('input[name="email"], input[type="email"]', email);
	await page.fill('input[name="password"], input[type="password"]', PASSWORD);
	await Promise.all([
		page.waitForURL((url) => !url.pathname.includes('/login')),
		page.click('button[type="submit"]')
	]);
}

test('a reply sent by the poster appears for the initiator via polling, without a manual reload', async ({
	browser
}) => {
	const posterCtx = await browser.newContext();
	const posterPage = await posterCtx.newPage();
	await login(posterPage, 'keirajd@gmail.com');

	await posterPage.goto('/my-listings');
	const listingHref = await posterPage.locator('.listing-link').first().getAttribute('href');
	expect(listingHref).toBeTruthy();

	const initiatorCtx = await browser.newContext();
	const initiatorPage = await initiatorCtx.newPage();
	await login(initiatorPage, 'keirockjd@gmail.com');

	await initiatorPage.goto(listingHref!);
	await Promise.all([
		initiatorPage.waitForURL((url) => url.pathname === '/inbox/new'),
		initiatorPage.click('a.respond-btn, a:has-text("Reply to this listing")')
	]);

	const firstMessage =
		"Hi there — I really liked how direct your listing was about what you're looking for. Would love to chat more if you're interested.";
	const composeForm = initiatorPage
		.locator('form')
		.filter({ has: initiatorPage.locator('textarea[name="body"]') });
	await composeForm.locator('textarea[name="body"]').fill(firstMessage);
	await Promise.all([
		initiatorPage.waitForURL((url) => /^\/inbox\/(?!new)[^/]+$/.test(url.pathname)),
		composeForm.locator('button[type="submit"]').click()
	]);

	const threadUrl = initiatorPage.url();
	expect(threadUrl).toMatch(/\/inbox\/(?!new)[^/]+$/);

	// poster opens the same thread and replies
	await posterPage.goto(threadUrl);
	const reply = 'Thanks for reaching out! Tell me more about what you are looking for.';
	const replyForm = posterPage
		.locator('form')
		.filter({ has: posterPage.locator('textarea[name="body"]') });
	await replyForm.locator('textarea[name="body"]').fill(reply);
	await replyForm.locator('button[type="submit"]').click();
	await expect(posterPage.getByText(reply)).toBeVisible({ timeout: 10_000 });

	// initiator never reloads — the 3s poll (invalidate('app:thread')) must surface the reply
	await expect(initiatorPage.getByText(reply)).toBeVisible({ timeout: 10_000 });

	await posterCtx.close();
	await initiatorCtx.close();
});
