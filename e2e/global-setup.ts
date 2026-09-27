import { execFileSync } from 'node:child_process';
import { randomBytes, scryptSync } from 'node:crypto';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { E2E_CONFIG, E2E_STATE } from './local-environment.js';

// The browser server and seed commands use the same dedicated local D1 state.
// Upserts preserve the open database handle when Playwright starts its server
// before global setup. Normal development data is never seeded or reset here.
//
// Every dependent insert resolves the owning user's id via a `SELECT ...
// FROM user WHERE email = ...` subquery rather than a hardcoded constant,
// since the user row may already exist (with a different id) from an
// earlier scripts/seed.sh run.

const KEIROCK_ID = 'e2e0000-0000-0000-0000-00000000a001';
const KIERA_ID = 'e2e0000-0000-0000-0000-00000000a002';
const KIERA_LISTING_ID = 'e2e0000-0000-0000-0000-00000000b001';
const EDIT_PHOTO_ID = 'e2e0000-0000-0000-0000-00000000a003';
const EDIT_PHOTO_LISTING_ID = 'e2e0000-0000-0000-0000-00000000b003';

function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const key = scryptSync(password.normalize('NFKC'), salt, 64, {
		N: 16384,
		r: 16,
		p: 1,
		maxmem: 128 * 1024 * 1024
	});
	return `${salt}:${key.toString('hex')}`;
}

function sq(s: string | null): string {
	if (s === null) return 'NULL';
	return `'${s.replace(/'/g, "''")}'`;
}

export default function globalSetup() {
	execFileSync(
		'pnpm',
		[
			'exec',
			'wrangler',
			'd1',
			'migrations',
			'apply',
			'DB',
			'--local',
			'--config',
			E2E_CONFIG,
			'--persist-to',
			E2E_STATE
		],
		{ stdio: 'inherit' }
	);

	const now = Math.floor(Date.now() / 1000);
	const nowMs = Date.now();
	const password = hashPassword('Password01');
	const expiresAt = now + 14 * 24 * 60 * 60;

	const sql = `
INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
VALUES (${sq(KEIROCK_ID)}, 'Keirock', 'keirockjd@gmail.com', 1, ${nowMs}, ${nowMs}),
       (${sq(KIERA_ID)}, 'Kiera', 'keirajd@gmail.com', 1, ${nowMs}, ${nowMs}),
       (${sq(EDIT_PHOTO_ID)}, 'Edit photo test', 'edit-photo@example.test', 1, ${nowMs}, ${nowMs})
ON CONFLICT (email) DO UPDATE SET updated_at = excluded.updated_at;

DELETE FROM account WHERE user_id IN (SELECT id FROM user WHERE email IN ('keirockjd@gmail.com', 'keirajd@gmail.com', 'edit-photo@example.test'));

INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
SELECT 'e2e-acct-1', 'keirockjd@gmail.com', 'credential', id, ${sq(password)}, ${nowMs}, ${nowMs} FROM user WHERE email = 'keirockjd@gmail.com';

INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
SELECT 'e2e-acct-2', 'keirajd@gmail.com', 'credential', id, ${sq(password)}, ${nowMs}, ${nowMs} FROM user WHERE email = 'keirajd@gmail.com';

INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
SELECT 'e2e-acct-3', 'edit-photo@example.test', 'credential', id, ${sq(password)}, ${nowMs}, ${nowMs} FROM user WHERE email = 'edit-photo@example.test';

INSERT INTO user_profiles (id, identity, physical_type, age, date_of_birth, lat, lng, phone_verified, trust_tier, alias, status, created_at, location_updated_at)
SELECT id, 'man', 'male', 47, ${now - 47 * 365 * 86400}, 38.5816, -121.4944, 1, 'trusted', 'Keirock', 'active', ${now}, ${now} FROM user WHERE email = 'keirockjd@gmail.com'
ON CONFLICT (id) DO UPDATE SET status = 'active', phone_verified = 1;

INSERT INTO user_profiles (id, identity, physical_type, age, date_of_birth, lat, lng, phone_verified, trust_tier, alias, status, created_at, location_updated_at)
SELECT id, 'woman', 'female', 43, ${now - 43 * 365 * 86400}, 38.5816, -121.4944, 1, 'trusted', 'Kiera', 'active', ${now}, ${now} FROM user WHERE email = 'keirajd@gmail.com'
ON CONFLICT (id) DO UPDATE SET status = 'active', phone_verified = 1;

INSERT INTO user_profiles (id, identity, physical_type, age, date_of_birth, lat, lng, phone_verified, trust_tier, alias, status, created_at, location_updated_at)
SELECT id, 'woman', 'female', 35, ${now - 35 * 365 * 86400}, 38.5816, -121.4944, 1, 'new', 'Photo test', 'active', ${now}, ${now} FROM user WHERE email = 'edit-photo@example.test'
ON CONFLICT (id) DO UPDATE SET status = 'active', phone_verified = 1;

INSERT INTO listings (id, user_id, category, subject, body, status, expires_at, last_bumped_at, created_at)
SELECT ${sq(KIERA_LISTING_ID)}, id, 'casual_encounters', 'E2E test listing — do not respond', 'Seeded automatically for the Playwright e2e suite.', 'active', ${expiresAt}, ${now}, ${now} FROM user WHERE email = 'keirajd@gmail.com'
ON CONFLICT (id) DO UPDATE SET status = 'active', expires_at = excluded.expires_at;

INSERT INTO listings (id, user_id, category, subject, body, status, nature_of_connection, expires_at, last_bumped_at, created_at)
SELECT ${sq(EDIT_PHOTO_LISTING_ID)}, id, 'casual_encounters', 'Edit listing photo browser test',
       'This synthetic listing exists to verify that photos can be added and removed while editing.',
       'active', '["dating"]', ${expiresAt}, ${now}, ${now} FROM user WHERE email = 'edit-photo@example.test'
ON CONFLICT (id) DO UPDATE SET status = 'active', expires_at = excluded.expires_at;

DELETE FROM listing_photos WHERE listing_id = ${sq(EDIT_PHOTO_LISTING_ID)};
DELETE FROM photo_vault WHERE user_id = (SELECT id FROM user WHERE email = 'edit-photo@example.test');

-- reset any thread/messages left over from a previous e2e run against this listing
DELETE FROM messages WHERE thread_id IN (SELECT id FROM conversation_threads WHERE listing_id = ${sq(KIERA_LISTING_ID)});
DELETE FROM key_exchanges WHERE thread_id IN (SELECT id FROM conversation_threads WHERE listing_id = ${sq(KIERA_LISTING_ID)});
DELETE FROM conversation_threads WHERE listing_id = ${sq(KIERA_LISTING_ID)};

-- reset any listing keirockjd created during a previous e2e run (free tier
-- allows only one active listing, so this must stay empty for the listing-
-- creation spec to run repeatably)
DELETE FROM relative_term_definitions WHERE listing_id IN (SELECT id FROM listings WHERE user_id = (SELECT id FROM user WHERE email = 'keirockjd@gmail.com'));
DELETE FROM listing_requirements WHERE listing_id IN (SELECT id FROM listings WHERE user_id = (SELECT id FROM user WHERE email = 'keirockjd@gmail.com'));
DELETE FROM listings WHERE user_id = (SELECT id FROM user WHERE email = 'keirockjd@gmail.com');
`;

	const seedDirectory = mkdtempSync(join(tmpdir(), 'jaydslist-e2e-seed-'));
	try {
		const seedPath = join(seedDirectory, 'seed.sql');
		writeFileSync(seedPath, sql);
		execFileSync(
			'pnpm',
			[
				'exec',
				'wrangler',
				'd1',
				'execute',
				'DB',
				'--local',
				'--config',
				E2E_CONFIG,
				'--persist-to',
				E2E_STATE,
				'--file',
				seedPath
			],
			{ stdio: 'inherit' }
		);
	} finally {
		rmSync(seedDirectory, { recursive: true, force: true });
	}
}
