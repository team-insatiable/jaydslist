import { test, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { deflateSync } from 'node:zlib';

const threadPath = '/inbox/e2e0000-0000-0000-0000-00000000c004';

function pngChunk(type: string, data: Buffer): Buffer {
	const tag = Buffer.from(type);
	const size = Buffer.alloc(4);
	size.writeUInt32BE(data.length);
	let crc = 0xffffffff;
	for (const byte of Buffer.concat([tag, data])) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
	}
	const checksum = Buffer.alloc(4);
	checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
	return Buffer.concat([size, tag, data, checksum]);
}

function uniquePng(): Buffer {
	const header = Buffer.alloc(13);
	header.writeUInt32BE(1, 0);
	header.writeUInt32BE(1, 4);
	header[8] = 8;
	header[9] = 2;
	return Buffer.concat([
		Buffer.from('89504e470d0a1a0a', 'hex'),
		pngChunk('IHDR', header),
		pngChunk('IDAT', deflateSync(Buffer.concat([Buffer.from([0]), randomBytes(3)]))),
		pngChunk('IEND', Buffer.alloc(0))
	]);
}

async function login(page: import('@playwright/test').Page, email: string) {
	await page.goto('/login');
	await page.fill('input[type="email"]', email);
	await page.fill('input[type="password"]', 'Password01');
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();
	await page.waitForURL('**/browse');
}

test('explicit photos can be allowed and blocked in one chat without changing the account setting', async ({
	browser
}) => {
	const recipientContext = await browser.newContext();
	const recipient = await recipientContext.newPage();
	const senderContext = await browser.newContext();
	const sender = await senderContext.newPage();
	try {
		await login(recipient, 'edit-photo@example.test');
		const presence = recipient.waitForResponse((response) => response.url().includes('/presence'));
		await recipient.goto(threadPath);
		await presence;
		await recipient.getByRole('button', { name: 'More options' }).click();
		await recipient.getByRole('button', { name: 'Photo settings' }).click();
		await recipient.mouse.move(5, 200);
		await expect(recipient.locator('.overlay-backdrop')).toHaveCSS(
			'background-color',
			'rgba(0, 0, 0, 0.45)'
		);
		const choice = recipient.getByLabel('Explicit photos from Kiera');
		await expect(choice).toHaveValue('inherit');
		await choice.selectOption('allow');
		await recipient
			.getByRole('dialog', { name: 'Photo settings for this conversation' })
			.getByRole('button', { name: 'Save' })
			.click();
		await expect(
			recipient.getByRole('dialog', { name: 'Photo settings for this conversation' })
		).toHaveCount(0);

		await login(sender, 'keirajd@gmail.com');
		const upload = await sender.request.post('/api/photos/upload', {
			multipart: {
				devContentRating: 'nsfw',
				file: { name: 'chat-explicit.png', mimeType: 'image/png', buffer: uniquePng() }
			}
		});
		expect(upload.status()).toBe(200);
		const photo = (await upload.json()) as { id: string; cfImageId: string };
		const sent = await sender.request.post(`${threadPath}?/send`, {
			form: { cfImageId: photo.cfImageId, body: '' },
			headers: { Origin: new URL(sender.url()).origin, Accept: 'application/json' }
		});
		expect(sent.ok()).toBeTruthy();
		await recipient.reload();
		await expect(recipient.getByRole('button', { name: 'View photo' })).toHaveCount(1);
		const scopedPath = `/api/photos/${photo.cfImageId}?threadId=${threadPath.split('/').pop()}`;
		expect((await recipient.request.get(scopedPath)).status()).toBe(200);
		expect((await recipient.request.get(`/api/photos/${photo.cfImageId}`)).status()).toBe(403);

		await recipient.getByRole('button', { name: 'More options' }).click();
		await recipient.getByRole('button', { name: 'Photo settings' }).click();
		await expect(choice).toHaveValue('allow');
		await choice.selectOption('block');
		await recipient
			.getByRole('dialog', { name: 'Photo settings for this conversation' })
			.getByRole('button', { name: 'Save' })
			.click();
		await expect(recipient.getByAltText('Blurred explicit content')).toBeVisible();
		await expect(recipient.getByText('NSFW · Hidden by your photo setting')).toBeVisible();
		expect((await recipient.request.get(scopedPath)).status()).toBe(403);
		expect((await recipient.request.get(`${scopedPath}&preview=blurred`)).status()).toBe(200);
		await recipient.goto('/profile');
		await expect(recipient.locator('#photo-nsfw')).toHaveValue('no');

		await sender.goto('/vault/uncategorized');
		const tile = sender.locator(`[data-photo-id="${photo.id}"]`);
		await tile.getByRole('button', { name: 'Delete photo' }).click();
		await expect(tile).toHaveCount(0);
	} finally {
		await recipientContext.close();
		await senderContext.close();
	}
});
