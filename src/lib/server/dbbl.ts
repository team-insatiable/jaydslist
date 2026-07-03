import { hashPhoneForDbbl, hashEmailForDbbl } from './phone';
import { decryptContact } from './crypto';

const BLOCK_RATINGS = new Set(['restricted', 'blacklisted']);

const CATEGORY_MAP: Record<string, string> = {
	harassment: 'harassment',
	spam: 'spam',
	fake_profile: 'fake_profile',
	explicit_content: 'explicit_content',
	unsolicited_dm: 'unsolicited_dm'
};

interface DbblEnv {
	DBBL_API_URL: string;
	DBBL_API_KEY: string;
}

export interface DbblScore {
	score: number | null;
	rating: string | null;
	confidence: string | null;
}

export async function queryDbblScore(
	phoneHash: string,
	emailHash: string,
	env: DbblEnv
): Promise<DbblScore | null> {
	const params = new URLSearchParams({ phoneHash, emailHash });
	const res = await fetch(`${env.DBBL_API_URL}/v1/scores?${params}`, {
		headers: { Authorization: `Bearer ${env.DBBL_API_KEY}` }
	});
	if (!res.ok) throw new Error(`DBBL non-OK: ${res.status}`);
	const data = await res.json<{
		status: 'found' | 'no_data';
		score: number | null;
		rating: string | null;
		confidence: string | null;
	}>();
	if (data.status !== 'found') return null;
	return { score: data.score ?? null, rating: data.rating ?? null, confidence: data.confidence ?? null };
}

export function isBlockedByDbbl(rating: string | null | undefined): boolean {
	return !!rating && BLOCK_RATINGS.has(rating);
}

export async function reportBanToDbbl(opts: {
	encryptedPhone: string;
	email: string;
	category: string;
	env: DbblEnv & { CONTACT_ENCRYPTION_KEY: string };
}): Promise<void> {
	const phone = await decryptContact(opts.encryptedPhone, opts.env.CONTACT_ENCRYPTION_KEY);
	const phoneHash = await hashPhoneForDbbl(phone);
	const emailHash = await hashEmailForDbbl(opts.email);
	const dbblCategory = CATEGORY_MAP[opts.category] ?? 'other';

	const res = await fetch(`${opts.env.DBBL_API_URL}/v1/reports`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${opts.env.DBBL_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ phoneHash, emailHash, violationCategory: dbblCategory, severity: 'medium' })
	});
	if (!res.ok) throw new Error(`DBBL report non-OK: ${res.status}`);
}
