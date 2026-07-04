import { getDb } from '$lib/server/db';
import {
	userProfiles,
	listings,
	conversationThreads,
	messages,
	photoVault,
	photoAlbums,
	listingPhotos
} from '$lib/server/db/schema';

export async function createTestUser(
	db: D1Database,
	overrides: Partial<{
		id: string;
		alias: string;
		identity: string;
		lat: number;
		lng: number;
		isSupporter: boolean;
	}> = {}
) {
	const id = overrides.id ?? crypto.randomUUID();
	await getDb(db)
		.insert(userProfiles)
		.values({
			id,
			alias: overrides.alias ?? 'Test User',
			identity: overrides.identity,
			lat: overrides.lat,
			lng: overrides.lng,
			isSupporter: overrides.isSupporter ?? false
		});
	return id;
}

export async function createTestVaultPhoto(
	db: D1Database,
	userId: string,
	overrides: Partial<{
		id: string;
		cfImageId: string;
		deletedAt: Date;
		albumId: string | null;
	}> = {}
) {
	const id = overrides.id ?? crypto.randomUUID();
	await getDb(db)
		.insert(photoVault)
		.values({
			id,
			userId,
			cfImageId: overrides.cfImageId ?? `test-cf-image-${id}`,
			deletedAt: overrides.deletedAt,
			albumId: overrides.albumId
		});
	return id;
}

export async function createTestAlbum(
	db: D1Database,
	userId: string,
	overrides: Partial<{ id: string; name: string }> = {}
) {
	const id = overrides.id ?? crypto.randomUUID();
	await getDb(db)
		.insert(photoAlbums)
		.values({
			id,
			userId,
			name: overrides.name ?? 'Test Album'
		});
	return id;
}

export async function createTestListingPhoto(
	db: D1Database,
	opts: {
		listingId: string;
		vaultPhotoId: string;
		id?: string;
		displayOrder?: number;
		purgedAt?: Date;
	}
) {
	const id = opts.id ?? crypto.randomUUID();
	await getDb(db)
		.insert(listingPhotos)
		.values({
			id,
			listingId: opts.listingId,
			vaultPhotoId: opts.vaultPhotoId,
			displayOrder: opts.displayOrder ?? 0,
			purgedAt: opts.purgedAt
		});
	return id;
}

export async function createTestListing(
	db: D1Database,
	userId: string,
	overrides: Partial<{ id: string; subject: string; status: string }> = {}
) {
	const id = overrides.id ?? crypto.randomUUID();
	await getDb(db)
		.insert(listings)
		.values({
			id,
			userId,
			subject: overrides.subject ?? 'Test listing subject',
			body: 'Test listing body',
			status: overrides.status ?? 'active',
			expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
		});
	return id;
}

export async function createTestThread(
	db: D1Database,
	opts: { listingId: string; initiatorId: string; posterId: string; id?: string }
) {
	const id = opts.id ?? crypto.randomUUID();
	await getDb(db).insert(conversationThreads).values({
		id,
		listingId: opts.listingId,
		initiatorId: opts.initiatorId,
		posterId: opts.posterId
	});
	return id;
}

export async function createTestMessage(
	db: D1Database,
	opts: { threadId: string; senderId: string; body?: string; sentAt?: Date }
) {
	const id = crypto.randomUUID();
	await getDb(db)
		.insert(messages)
		.values({
			id,
			threadId: opts.threadId,
			senderId: opts.senderId,
			body: opts.body ?? 'test message body',
			sentAt: opts.sentAt ?? new Date()
		});
	return id;
}
