import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { POST } from './+server';
import {
	createTestUser,
	createTestVaultPhoto,
	createTestListing,
	createTestThread
} from '$lib/server/test-helpers/fixtures';

function event(userId: string, threadId: string, messageId: string) {
	return {
		locals: { user: { id: userId } },
		platform: { env },
		params: { threadId, messageId }
	} as unknown as Parameters<typeof POST>[0];
}

describe('expiring photo view', () => {
	it('requires the recipient’s current chat choice and returns a chat-scoped URL', async () => {
		const posterId = await createTestUser(env.DB);
		const recipientId = await createTestUser(env.DB);
		await createTestVaultPhoto(env.DB, posterId, {
			cfImageId: 'expiring-chat-nsfw',
			contentRating: 'nsfw'
		});
		const listingId = await createTestListing(env.DB, posterId);
		const threadId = await createTestThread(env.DB, {
			listingId,
			initiatorId: recipientId,
			posterId
		});
		const messageId = crypto.randomUUID();
		await env.DB.prepare(
			'INSERT INTO messages (id, thread_id, sender_id, body, cf_image_id, is_expiring) VALUES (?, ?, ?, ?, ?, 1)'
		)
			.bind(messageId, threadId, posterId, '', 'expiring-chat-nsfw')
			.run();
		await expect(POST(event(recipientId, threadId, messageId))).rejects.toMatchObject({
			status: 403
		});
		await env.DB.prepare('UPDATE conversation_threads SET initiator_nsfw_choice = ? WHERE id = ?')
			.bind('allow', threadId)
			.run();
		const response = await POST(event(recipientId, threadId, messageId));
		expect(await response.json()).toMatchObject({
			cfImageUrl: `/api/photos/expiring-chat-nsfw?threadId=${threadId}`
		});
	});
});
