import { execSync } from 'node:child_process';
import { randomBytes, scryptSync } from 'node:crypto';
import { writeFileSync, unlinkSync } from 'node:fs';

// Unlike scripts/seed.sh (which wipes the whole local D1 file), this setup
// mutates rows in place via plain SQL upserts. Wiping the underlying sqlite
// file while a Cloudflare dev server (pnpm dev / miniflare) has it open
// leaves that server's D1 binding pointing at a stale/invalid file handle —
// confirmed to break login with a 500 on an already-running dev server.
// Upsert-only writes are safe regardless of whether a server is already up.
//
// Every dependent insert resolves the owning user's id via a `SELECT ...
// FROM user WHERE email = ...` subquery rather than a hardcoded constant,
// since the user row may already exist (with a different id) from an
// earlier scripts/seed.sh run.

const KEIROCK_ID = 'e2e0000-0000-0000-0000-00000000a001';
const KIERA_ID = 'e2e0000-0000-0000-0000-00000000a002';
const KIERA_LISTING_ID = 'e2e0000-0000-0000-0000-00000000b001';

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
	execSync('npx wrangler d1 migrations apply jaydslist-d1 --local', { stdio: 'inherit' });

	const now = Math.floor(Date.now() / 1000);
	const nowMs = Date.now();
	const password = hashPassword('Password01');
	const expiresAt = now + 14 * 24 * 60 * 60;

	const sql = `
INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
VALUES (${sq(KEIROCK_ID)}, 'Keirock', 'keirockjd@gmail.com', 1, ${nowMs}, ${nowMs}),
       (${sq(KIERA_ID)}, 'Kiera', 'keirajd@gmail.com', 1, ${nowMs}, ${nowMs})
ON CONFLICT (email) DO UPDATE SET updated_at = excluded.updated_at;

DELETE FROM account WHERE user_id IN (SELECT id FROM user WHERE email IN ('keirockjd@gmail.com', 'keirajd@gmail.com'));

INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
SELECT 'e2e-acct-1', 'keirockjd@gmail.com', 'credential', id, ${sq(password)}, ${nowMs}, ${nowMs} FROM user WHERE email = 'keirockjd@gmail.com';

INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
SELECT 'e2e-acct-2', 'keirajd@gmail.com', 'credential', id, ${sq(password)}, ${nowMs}, ${nowMs} FROM user WHERE email = 'keirajd@gmail.com';

INSERT INTO user_profiles (id, identity, physical_type, age, date_of_birth, lat, lng, phone_verified, trust_tier, alias, status, created_at, location_updated_at)
SELECT id, 'man', 'male', 47, ${now - 47 * 365 * 86400}, 38.5816, -121.4944, 1, 'trusted', 'Keirock', 'active', ${now}, ${now} FROM user WHERE email = 'keirockjd@gmail.com'
ON CONFLICT (id) DO UPDATE SET status = 'active', phone_verified = 1;

INSERT INTO user_profiles (id, identity, physical_type, age, date_of_birth, lat, lng, phone_verified, trust_tier, alias, status, created_at, location_updated_at)
SELECT id, 'woman', 'female', 43, ${now - 43 * 365 * 86400}, 38.5816, -121.4944, 1, 'trusted', 'Kiera', 'active', ${now}, ${now} FROM user WHERE email = 'keirajd@gmail.com'
ON CONFLICT (id) DO UPDATE SET status = 'active', phone_verified = 1;

INSERT INTO listings (id, user_id, category, subject, body, status, expires_at, last_bumped_at, created_at)
SELECT ${sq(KIERA_LISTING_ID)}, id, 'casual_encounters', 'E2E test listing — do not respond', 'Seeded automatically for the Playwright e2e suite.', 'active', ${expiresAt}, ${now}, ${now} FROM user WHERE email = 'keirajd@gmail.com'
ON CONFLICT (id) DO UPDATE SET status = 'active', expires_at = excluded.expires_at;

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

	const tmpPath = '/tmp/jdl-e2e-seed.sql';
	writeFileSync(tmpPath, sql);
	execSync(`npx wrangler d1 execute jaydslist-d1 --local --file=${tmpPath}`, { stdio: 'inherit' });
	unlinkSync(tmpPath);
}
