import { sql } from 'drizzle-orm';
import {
	sqliteTable,
	text,
	integer,
	real,
	index,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';

export type UserIdentity = 'man' | 'woman' | 'non_binary' | 'transgender_man' | 'transgender_woman' | 'other' | 'couple';
export type CoupleComposition = 'mf' | 'mm' | 'ff' | 'other';
export type PhysicalType = 'male' | 'female' | 'other';
export type BodyType = 'slim' | 'athletic' | 'average' | 'curvy' | 'stocky' | 'muscular' | 'plus_size' | 'extra_padding';
export type TrustTier = 'new' | 'established' | 'trusted';
export type AccountStatus = 'active' | 'suspended' | 'banned';
export type ListingStatus = 'active' | 'expired' | 'renewed' | 'removed' | 'flagged';
export type NatureOfConnection = 'dating' | 'fwb' | 'one_time' | 'platonic' | 'open';
export type MoodVibe = 'coffee_first' | 'dinner_date' | 'netflix_chill' | 'ready_now' | 'just_browsing';
export type Availability = 'available_now' | 'available_today' | 'available_weekend' | 'flexible';
export type ListingCategory = 'casual_encounters';
export type RequirementType = 'hard' | 'soft';
export type RequirementField = 'age_min' | 'age_max' | 'distance' | 'trust_tier' | 'verified_only' | 'identity' | 'physical';
export type MediaScanStatus = 'pending' | 'cleared' | 'flagged';
export type ThreadStatus = 'open' | 'closed' | 'archived';
export type MessageScanStatus = 'pending' | 'cleared' | 'flagged' | 'blocked';
export type KeyExchangeStatus = 'offered' | 'accepted' | 'declined' | 'revoked';
export type ContactMethodType = 'phone' | 'email' | 'snapchat' | 'instagram' | 'telegram' | 'signal' | 'discord' | 'whatsapp' | 'other';
export type ReportTargetType = 'listing' | 'message' | 'user';
export type ReportStatus = 'pending' | 'reviewed' | 'confirmed' | 'dismissed';
export type ModerationActionType = 'warn' | 'restrict' | 'suspend' | 'ban' | 'remove_listing' | 'remove_message';
export type ListingEventType = 'created' | 'bumped' | 'renewed' | 'expired' | 'archived';

export const userProfiles = sqliteTable(
	'user_profiles',
	{
		id: text('id').primaryKey(),
		identity: text('identity'),
		physicalType: text('physical_type'),
		bodyType: text('body_type'),
		coupleComposition: text('couple_composition'),
		dateOfBirth: integer('date_of_birth', { mode: 'timestamp' }),
		age: integer('age'),
		phoneHash: text('phone_hash').unique(),
		encryptedPhone: text('encrypted_phone'),
		phoneVerified: integer('phone_verified', { mode: 'boolean' }).notNull().default(false),
		phoneCarrierValidated: integer('phone_carrier_validated', { mode: 'boolean' }).notNull().default(false),
		trustTier: text('trust_tier').notNull().default('new'),
		reporterTrustScore: real('reporter_trust_score').notNull().default(0.5),
		responseRate: real('response_rate').notNull().default(0),
		totalThreads: integer('total_threads').notNull().default(0),
		respondedThreads: integer('responded_threads').notNull().default(0),
		warningIssued: integer('warning_issued', { mode: 'boolean' }).notNull().default(false),
		warningIssuedAt: integer('warning_issued_at', { mode: 'timestamp' }),
		dbblRiskScore: real('dbbl_risk_score'),
		dbblRiskRating: text('dbbl_risk_rating'),
		dbblLastCheckedAt: integer('dbbl_last_checked_at', { mode: 'timestamp' }),
		status: text('status').notNull().default('active'),
		lastActiveAt: integer('last_active_at', { mode: 'timestamp' }),
		// Location — stored server-side only, never exposed to client
		lat: real('lat'),
		lng: real('lng'),
		locationUpdatedAt: integer('location_updated_at', { mode: 'timestamp' }),
		// Browse preferences — what this user is looking for
		seekingIdentity: text('seeking_identity').notNull().default('[]'),
		seekingPhysicalType: text('seeking_physical_type'),
		seekingBodyType: text('seeking_body_type').notNull().default('[]'),
		seekingNatureOfConnection: text('seeking_nature_of_connection').notNull().default('[]'),
		browseRadius: integer('browse_radius').notNull().default(25),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
	},
	(table) => ({
		phoneHashIdx: index('profiles_phone_hash_idx').on(table.phoneHash),
		trustTierIdx: index('profiles_trust_tier_idx').on(table.trustTier),
		statusIdx: index('profiles_status_idx').on(table.status)
	})
);

export const contactMethods = sqliteTable(
	'contact_methods',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
		type: text('type').notNull(),
		encryptedValue: text('encrypted_value').notNull(),
		verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
		displayOrder: integer('display_order').notNull().default(0),
		active: integer('active', { mode: 'boolean' }).notNull().default(true),
		isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
	},
	(table) => ({
		userIdx: index('contact_methods_user_idx').on(table.userId),
		activeIdx: index('contact_methods_active_idx').on(table.userId, table.active)
	})
);

export const listings = sqliteTable(
	'listings',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
		category: text('category').notNull().default('casual_encounters'),
		subject: text('subject').notNull(),
		body: text('body').notNull(),
		status: text('status').notNull().default('active'),
		lookingForIdentity: text('looking_for_identity').notNull().default('[]'),
		lookingForPhysical: text('looking_for_physical').notNull().default('[]'),
		ageRangeMin: integer('age_range_min'),
		ageRangeMax: integer('age_range_max'),
		natureOfConnection: text('nature_of_connection').notNull().default('[]'),
		mood: text('mood'),
		availability: text('availability'),
		lat: real('lat'),
		lng: real('lng'),
		fuzzyLocation: text('fuzzy_location'),
		expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
		lastBumpedAt: integer('last_bumped_at', { mode: 'timestamp' }),
		bumpCount: integer('bump_count').notNull().default(0),
		renewedAt: integer('renewed_at', { mode: 'timestamp' }),
		originalCreatedAt: integer('original_created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
	},
	(table) => ({
		userIdx: index('listings_user_idx').on(table.userId),
		statusIdx: index('listings_status_idx').on(table.status),
		categoryIdx: index('listings_category_idx').on(table.category),
		lastBumpedAtIdx: index('listings_last_bumped_at_idx').on(table.lastBumpedAt),
		expiresAtIdx: index('listings_expires_at_idx').on(table.expiresAt)
	})
);

export const listingRequirements = sqliteTable(
	'listing_requirements',
	{
		id: text('id').primaryKey(),
		listingId: text('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
		type: text('type').notNull(),
		field: text('field').notNull(),
		value: text('value').notNull(),
		promptText: text('prompt_text')
	},
	(table) => ({
		listingIdx: index('requirements_listing_idx').on(table.listingId)
	})
);

export const listingMedia = sqliteTable(
	'listing_media',
	{
		id: text('id').primaryKey(),
		listingId: text('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
		r2Key: text('r2_key').notNull(),
		displayOrder: integer('display_order').notNull().default(0),
		scanStatus: text('scan_status').notNull().default('pending'),
		uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
	},
	(table) => ({
		listingIdx: index('media_listing_idx').on(table.listingId)
	})
);

export const relativeTermDefinitions = sqliteTable(
	'relative_term_definitions',
	{
		id: text('id').primaryKey(),
		listingId: text('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
		term: text('term').notNull(),
		definition: text('definition').notNull()
	},
	(table) => ({
		listingIdx: index('terms_listing_idx').on(table.listingId),
		uniqueTermPerListing: uniqueIndex('terms_unique_per_listing').on(table.listingId, table.term)
	})
);

export const listingEvents = sqliteTable(
	'listing_events',
	{
		id: text('id').primaryKey(),
		listingId: text('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
		eventType: text('event_type').notNull(),
		actorId: text('actor_id').references(() => userProfiles.id),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
	},
	(table) => ({
		listingIdx: index('events_listing_idx').on(table.listingId),
		eventTypeIdx: index('events_type_idx').on(table.eventType)
	})
);

export const conversationThreads = sqliteTable(
	'conversation_threads',
	{
		id: text('id').primaryKey(),
		listingId: text('listing_id').notNull().references(() => listings.id),
		initiatorId: text('initiator_id').notNull().references(() => userProfiles.id),
		posterId: text('poster_id').notNull().references(() => userProfiles.id),
		status: text('status').notNull().default('open'),
		acknowledgedRequirements: text('acknowledged_requirements').notNull().default('[]'),
		initiatorResponseRate: real('initiator_response_rate'),
		initiatorWarned: integer('initiator_warned', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
		lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
	},
	(table) => ({
		listingIdx: index('threads_listing_idx').on(table.listingId),
		initiatorIdx: index('threads_initiator_idx').on(table.initiatorId),
		posterIdx: index('threads_poster_idx').on(table.posterId),
		statusIdx: index('threads_status_idx').on(table.status),
		uniqueThreadPerListing: uniqueIndex('threads_unique_per_listing').on(table.listingId, table.initiatorId)
	})
);

export const messages = sqliteTable(
	'messages',
	{
		id: text('id').primaryKey(),
		threadId: text('thread_id').notNull().references(() => conversationThreads.id, { onDelete: 'cascade' }),
		senderId: text('sender_id').notNull().references(() => userProfiles.id),
		body: text('body').notNull(),
		scanStatus: text('scan_status').notNull().default('pending'),
		qualityScore: real('quality_score'),
		qualityFlags: text('quality_flags').notNull().default('[]'),
		similarityScore: real('similarity_score'),
		wasPrompted: integer('was_prompted', { mode: 'boolean' }).notNull().default(false),
		wasRewritten: integer('was_rewritten', { mode: 'boolean' }).notNull().default(false),
		sentAt: integer('sent_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
		readAt: integer('read_at', { mode: 'timestamp' })
	},
	(table) => ({
		threadIdx: index('messages_thread_idx').on(table.threadId),
		senderIdx: index('messages_sender_idx').on(table.senderId),
		scanStatusIdx: index('messages_scan_status_idx').on(table.scanStatus),
		sentAtIdx: index('messages_sent_at_idx').on(table.sentAt)
	})
);

export const messageQualityLog = sqliteTable(
	'message_quality_log',
	{
		id: text('id').primaryKey(),
		messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
		senderId: text('sender_id').notNull().references(() => userProfiles.id),
		checkType: text('check_type').notNull(),
		score: real('score'),
		flagged: integer('flagged', { mode: 'boolean' }).notNull().default(false),
		detail: text('detail'),
		checkedAt: integer('checked_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
	},
	(table) => ({
		messageIdx: index('quality_log_message_idx').on(table.messageId),
		senderIdx: index('quality_log_sender_idx').on(table.senderId)
	})
);

export const keyExchanges = sqliteTable(
	'key_exchanges',
	{
		id: text('id').primaryKey(),
		threadId: text('thread_id').notNull().references(() => conversationThreads.id, { onDelete: 'cascade' }),
		offeringUserId: text('offering_user_id').notNull().references(() => userProfiles.id),
		receivingUserId: text('receiving_user_id').notNull().references(() => userProfiles.id),
		status: text('status').notNull().default('offered'),
		contactMethodIds: text('contact_method_ids').notNull().default('[]'),
		offeredAt: integer('offered_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
		resolvedAt: integer('resolved_at', { mode: 'timestamp' })
	},
	(table) => ({
		threadIdx: index('key_exchanges_thread_idx').on(table.threadId),
		offeringIdx: index('key_exchanges_offering_idx').on(table.offeringUserId),
		receivingIdx: index('key_exchanges_receiving_idx').on(table.receivingUserId)
	})
);

export const reports = sqliteTable(
	'reports',
	{
		id: text('id').primaryKey(),
		reporterId: text('reporter_id').notNull().references(() => userProfiles.id),
		targetType: text('target_type').notNull(),
		targetId: text('target_id').notNull(),
		category: text('category').notNull(),
		detail: text('detail'),
		status: text('status').notNull().default('pending'),
		reviewerNotes: text('reviewer_notes'),
		reporterTrustScoreSnapshot: real('reporter_trust_score_snapshot').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
		resolvedAt: integer('resolved_at', { mode: 'timestamp' })
	},
	(table) => ({
		reporterIdx: index('reports_reporter_idx').on(table.reporterId),
		targetIdx: index('reports_target_idx').on(table.targetType, table.targetId),
		statusIdx: index('reports_status_idx').on(table.status)
	})
);

export const moderationActions = sqliteTable(
	'moderation_actions',
	{
		id: text('id').primaryKey(),
		actorId: text('actor_id').references(() => userProfiles.id),
		targetType: text('target_type').notNull(),
		targetId: text('target_id').notNull(),
		actionType: text('action_type').notNull(),
		reason: text('reason').notNull(),
		reportId: text('report_id').references(() => reports.id),
		expiresAt: integer('expires_at', { mode: 'timestamp' }),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
	},
	(table) => ({
		actorIdx: index('mod_actions_actor_idx').on(table.actorId),
		targetIdx: index('mod_actions_target_idx').on(table.targetType, table.targetId),
		actionTypeIdx: index('mod_actions_type_idx').on(table.actionType)
	})
);

export const platformConfig = sqliteTable('platform_config', {
	key: text('key').primaryKey(),
	value: text('value').notNull(),
	description: text('description'),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const DEFAULT_CONFIG = {
	LISTING_DURATION_DAYS: '14',
	LISTING_GRACE_PERIOD_DAYS: '7',
	LISTING_MAX_BUMPS_PER_PERIOD: '14',
	LISTING_BUMP_COOLDOWN_HOURS: '24',
	MESSAGE_MIN_LENGTH: '100',
	MESSAGE_SIMILARITY_THRESHOLD: '0.8',
	TRUST_TIER_ESTABLISHED_DAYS: '14',
	TRUST_TIER_TRUSTED_DAYS: '60',
	DBBL_CHECK_ENABLED: 'true',
	DBBL_BLOCK_RATING: 'restricted',
	RESPONSE_RATE_NUDGE_HOURS: '48',
	THREAD_VELOCITY_NEW_PER_DAY: '3',
	THREAD_VELOCITY_ESTABLISHED_PER_DAY: '10',
	THREAD_VELOCITY_TRUSTED_PER_DAY: '25',
	INSTANCE_NAME: 'Jaydslist',
	INSTANCE_TAGLINE: 'Real connections, real people',
	INSTANCE_URL: 'https://jaydslist.com'
} as const;

export * from './auth.schema';
