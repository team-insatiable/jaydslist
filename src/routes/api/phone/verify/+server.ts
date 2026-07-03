import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkOtp } from '$lib/server/twilio';
import { getDb } from '$lib/server/db';
import { userProfiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { encryptContact } from '$lib/server/crypto';
import { hashPhoneLocal, hashPhoneForDbbl, hashEmailForDbbl } from '$lib/server/phone';

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
	const phoneHash = await hashPhoneLocal(pendingPhone, env.PHONE_PEPPER ?? 'default-pepper');
	const dbblPhoneHash = await hashPhoneForDbbl(pendingPhone);
	const dbblEmailHash = await hashEmailForDbbl(locals.user.email);

	// Query DBBL with both signals in one request — entity model resolves them server-side
	let dbblRiskScore: number | null = null;
	let dbblRiskRating: string | null = null;
	let dbblConfidence: string | null = null;

	try {
		const params = new URLSearchParams({
			phoneHash: dbblPhoneHash,
			emailHash: dbblEmailHash
		});
		const res = await fetch(`${env.DBBL_API_URL}/v1/scores?${params}`, {
			headers: { Authorization: `Bearer ${env.DBBL_API_KEY}` }
		});

		if (!res.ok) {
			console.error('DBBL non-OK:', res.status);
		} else {
			const data = await res.json<{
				status: 'found' | 'no_data';
				score: number | null;
				rating: string | null;
				confidence: string | null;
			}>();

			if (data.status === 'found') {
				dbblRiskScore = data.score ?? null;
				dbblRiskRating = data.rating ?? null;
				dbblConfidence = data.confidence ?? null;
			}
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
			dbblConfidence,
			dbblLastCheckedAt: new Date()
		})
		.where(eq(userProfiles.id, locals.user.id));

	// Clean up KV
	await env.PHONE_VERIFICATION_KV.delete(`pending_phone:${locals.user.id}`);

	return json({ success: true });
};

