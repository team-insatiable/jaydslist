import { test, expect } from '@playwright/test';
import { renderMarkdown } from '../src/lib/document-markdown';

for (const width of [390, 1440]) {
	test(`public information pages work at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		for (const colorScheme of ['light', 'dark'] as const) {
			await page.emulateMedia({ colorScheme });
			for (const route of ['/about', '/rules', '/privacy', '/terms']) {
				await page.goto(route);
				await expect(page.locator('.document-content h1')).toBeVisible();
				const navigation = page.getByRole('navigation', { name: 'About and policies' });
				await expect(navigation.getByRole('link')).toHaveCount(4);
				await expect(navigation.locator('[aria-current="page"]')).toHaveAttribute('href', route);
				expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
					true
				);
				if (width === 1440 && (await page.locator('.document-content h2').count()) > 0) {
					const contents = page.getByRole('navigation', { name: 'On this page' });
					const link = contents.getByRole('link').first();
					const target = await link.getAttribute('href');
					await link.click();
					await expect(page.locator(target!)).toBeInViewport();
				}
			}
		}
		await page.goto('/about');
		await page
			.getByRole('navigation', { name: 'About and policies' })
			.getByRole('link', { name: 'Privacy' })
			.click();
		await expect(page).toHaveURL(/\/privacy$/);
	});
}

test('full-length documents preserve paragraphs, line breaks, and readable cards', async ({
	page
}) => {
	const fixture =
		'# Example policy\n\nFirst introductory paragraph.\n\nSecond introductory paragraph.\n\n## Your information\n\nFirst line.  \nSecond line.\n\nA separate paragraph explaining the policy in more detail.\n\n- First complete rule with enough detail to wrap across several lines on smaller screens.\n- Second complete rule with the context readers need to understand it.\n\n## Your choices\n\n3. Contact the operator.\n4. Request a copy.\n\nClosing paragraph.';
	for (const width of [390, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		for (const [route, variant] of [
			['/about', 'about'],
			['/rules', 'rules'],
			['/privacy', 'document'],
			['/terms', 'document']
		] as const) {
			await page.goto(route);
			await expect(page.locator('.document-content')).toHaveAttribute('data-hydrated', 'true');
			await page.locator('.document-content').evaluate(
				(article, html) => {
					article.innerHTML = html;
				},
				renderMarkdown(fixture, variant)
			);
			await expect(page.getByText('Second introductory paragraph.', { exact: true })).toBeVisible();
			await expect(page.locator('.document-content br')).toHaveCount(1);
			await expect(page.locator('.document-content ol')).toHaveAttribute('start', '3');
			const gap = await page
				.locator('.document-content p')
				.first()
				.evaluate((p) => parseFloat(getComputedStyle(p).marginBottom));
			expect(gap).toBeGreaterThanOrEqual(16);
			if (variant !== 'document') {
				const padding = await page
					.locator('.document-content')
					.evaluate((article) => getComputedStyle(article).padding);
				expect(padding).toBe('0px');
			}
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
		}
	}
});

test('Self-host links to the operator guide, not just the repository homepage', async ({
	page
}) => {
	await page.goto('/');
	await page.getByRole('contentinfo').getByRole('link', { name: 'Self-host' }).click();
	await expect(page).toHaveURL(/\/self-host$/);
	await expect(page.getByRole('link', { name: 'Read the self-hosting guide' })).toHaveAttribute(
		'href',
		/\/blob\/main\/docs\/self-hosting\/README\.md$/
	);
});
