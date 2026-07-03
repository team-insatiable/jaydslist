import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { lookupPhone, sendOtp } from '$lib/server/twilio';
import { getDb } from '$lib/server/db';
import { userProfiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPhoneLocal } from '$lib/server/phone';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	if (locals.phoneVerified) return json({ error: 'Phone already verified' }, { status: 409 });

	const body = await request.json<{ phone?: string }>();
	const phone = body.phone?.trim();
	if (!phone) return json({ error: 'Phone number is required' }, { status: 400 });

	const env = platform?.env;
	if (!env) return json({ error: 'Server configuration error' }, { status: 500 });

	const db = getDb(env.DB);

	let lookup;
	try {
		lookup = await lookupPhone(phone, env);
	} catch (err) {
		console.error('Lookup error:', err);
		return json({ error: 'Unable to validate phone number' }, { status: 502 });
	}

	if (!lookup.valid) return json({ error: 'Invalid phone number' }, { status: 422 });
	if (lookup.isVoip) {
		return json({ error: 'VoIP numbers are not permitted. Please use a real mobile number.' }, { status: 422 });
	}

	const normalizedPhone = lookup.e164 ?? phone;

	// Check if phone hash already in use by another account
	const phoneHash = await hashPhoneLocal(normalizedPhone, env.PHONE_PEPPER ?? 'default-pepper');
	const existing = await db
		.select({ id: userProfiles.id })
		.from(userProfiles)
		.where(eq(userProfiles.phoneHash, phoneHash))
		.get();

	if (existing && existing.id !== locals.user.id) {
		return json({ error: 'This phone number is already associated with another account' }, { status: 409 });
	}

	// Store normalized phone in KV temporarily for OTP verification
	await env.PHONE_VERIFICATION_KV.put(
		`pending_phone:${locals.user.id}`,
		normalizedPhone,
		{ expirationTtl: 600 } // 10 minutes
	);

	try {
		await sendOtp(normalizedPhone, env);
	} catch (err) {
		console.error('Verify send error:', err);
		return json({ error: 'Failed to send verification code' }, { status: 502 });
	}

	return json({ success: true, phone: normalizedPhone });
};