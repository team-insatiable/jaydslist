import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkOtp } from '$lib/server/twilio';
import { getDb } from '$lib/server/db';
import { userProfiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { encryptContact } from '$lib/server/crypto';

const BLOCK_RATINGS = new Set(['restricted', 'blacklisted']);

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	if (locals.phoneVerified) return json({ error: 'Phone already verified' }, { status: 409 });

	const body = await request.json<{ code?: string }>();
	const code = body.code?.trim();
	if (!code) return json({ error: 'Verification code is required' }, { status: 400 });

	const env = platform?.env;
	if (!env) return json({ error: 'Server configuration error' }, { status: 500 });

	// Retrieve pending phone from KV
	const pendingPhone = await env.PHONE_VERIFICATION_KV.get(`pending_phone:${locals.user.id}`);
	if (!pendingPhone) {
		return json({ error: 'No pending phone number found. Please submit your phone number first.' }, { status: 400 });
	}

	let result;
	try {
		result = await checkOtp(pendingPhone, code, env);
	} catch (err) {
		console.error('Verify check error:', err);
		return json({ error: 'Failed to check verification code' }, { status: 502 });
	}

	if (!result.success) return json({ error: 'Invalid or expired verification code' }, { status: 422 });

	// Two separate hashes — local uses pepper for DB security, DBBL uses plain E.164 for cross-platform consistency
	const phoneHash = await hashPhone(pendingPhone, env.PHONE_PEPPER ?? 'default-pepper');
	const dbblPhoneHash = await hashPhonePlain(pendingPhone);
	const dbblEmailHash = await hashEmail(locals.user.email);

	// Query DBBL by phone and email — fail open if unavailable, block if either is restricted/blacklisted
	let dbblRiskScore: number | null = null;
	let dbblRiskRating: string | null = null;

	const RATING_SEVERITY: Record<string, number> = {
		clear: 0, flagged: 1, cautioned: 2, restricted: 3, blacklisted: 4
	};

	async function queryDbbl(param: string, value: string): Promise<{ score: number | null; rating: string | null }> {
		const res = await fetch(
			`${env.DBBL_API_URL}/v1/scores?${param}=${encodeURIComponent(value)}`,
			{ headers: { Authorization: `Bearer ${env.DBBL_API_KEY}` } }
		);
		if (!res.ok) { console.error(`DBBL non-OK (${param}):`, res.status); return { score: null, rating: null }; }
		const data = await res.json<{ score?: number | null; rating?: string | null }>();
		return { score: data.score ?? null, rating: data.rating ?? null };
	}

	try {
		const [phoneResult, emailResult] = await Promise.all([
			queryDbbl('phoneHash', dbblPhoneHash),
			queryDbbl('emailHash', dbblEmailHash)
		]);

		// Use the worse of the two ratings
		const phoneSev = RATING_SEVERITY[phoneResult.rating ?? ''] ?? -1;
		const emailSev = RATING_SEVERITY[emailResult.rating ?? ''] ?? -1;
		if (phoneSev >= emailSev) {
			dbblRiskScore = phoneResult.score;
			dbblRiskRating = phoneResult.rating;
		} else {
			dbblRiskScore = emailResult.score;
			dbblRiskRating = emailResult.rating;
		}

		if (dbblRiskRating && BLOCK_RATINGS.has(dbblRiskRating)) {
			return json(
				{ error: 'Account registration is not permitted at this time.' },
				{ status: 403 }
			);
		}
	} catch (err) {
		// DBBL down — fail open, log and continue
		console.error('DBBL check failed, failing open:', err);
	}

	const db = getDb(env.DB);

	const encryptedPhone = await encryptContact(pendingPhone, env.CONTACT_ENCRYPTION_KEY);

	await db
		.update(userProfiles)
		.set({
			phoneHash,
			encryptedPhone,
			phoneVerified: true,
			phoneCarrierValidated: true,
			dbblRiskScore,
			dbblRiskRating,
			dbblLastCheckedAt: new Date()
		})
		.where(eq(userProfiles.id, locals.user.id));

	// Clean up KV
	await env.PHONE_VERIFICATION_KV.delete(`pending_phone:${locals.user.id}`);

	return json({ success: true });
};

async function hashPhone(phone: string, pepper: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(phone + pepper);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Plain E.164 SHA256 — no pepper — for cross-platform DBBL consistency
async function hashPhonePlain(phone: string): Promise<string> {
	const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(phone));
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Lowercase + trim email before hashing — for cross-platform DBBL consistency
async function hashEmail(email: string): Promise<string> {
	const normalized = email.toLowerCase().trim();
	const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
