// Raw fetch-based Twilio client — no SDK, Workers-compatible

export interface TwilioEnv {
	TWILIO_ACCOUNT_SID: string;
	TWILIO_AUTH_TOKEN: string;
	TWILIO_VERIFY_SERVICE_SID: string;
	ENVIRONMENT?: string;
	DEV_BYPASS_OTP?: string;
}

function basicAuth(env: TwilioEnv): string {
	return btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
}

function isBypassActive(env: TwilioEnv): boolean {
	return env.ENVIRONMENT === 'development' && !!env.DEV_BYPASS_OTP;
}

export type LineType =
	| 'mobile'
	| 'landline'
	| 'voip'
	| 'unknown'
	| 'nonFixedVoip'
	| 'fixedVoip';

export interface LookupResult {
	valid: boolean;
	lineType: LineType | null;
	isVoip: boolean;
	nationalFormat: string | null;
	e164: string | null;
}

export async function lookupPhone(phoneNumber: string, env: TwilioEnv): Promise<LookupResult> {
	if (isBypassActive(env)) {
		// Normalize to E.164 in dev — require at least 10 digits
		const digits = phoneNumber.replace(/\D/g, '');
		if (digits.length < 10) return { valid: false, lineType: null, isVoip: false, nationalFormat: null, e164: null };
		const e164 = digits.length === 10 ? `+1${digits}` : digits.startsWith('1') && digits.length === 11 ? `+${digits}` : `+${digits}`;
		return { valid: true, lineType: 'mobile', isVoip: false, nationalFormat: phoneNumber, e164 };
	}

	const encoded = encodeURIComponent(phoneNumber);
	const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encoded}?Fields=line_type_intelligence`;

	const res = await fetch(url, {
		headers: { Authorization: `Basic ${basicAuth(env)}` }
	});

	if (!res.ok) {
		const body = await res.json<{ message?: string }>();
		throw new Error(`Twilio Lookup failed: ${body.message ?? res.statusText}`);
	}

	const data = await res.json<{
		valid: boolean;
		national_format: string | null;
		phone_number: string | null;
		line_type_intelligence?: { type: LineType } | null;
	}>();

	const lineType = data.line_type_intelligence?.type ?? null;
	const isVoip = lineType === 'voip' || lineType === 'nonFixedVoip' || lineType === 'fixedVoip';

	return {
		valid: data.valid,
		lineType,
		isVoip,
		nationalFormat: data.national_format,
		e164: data.phone_number
	};
}

export interface SendOtpResult {
	success: boolean;
	status: string;
}

export async function sendOtp(phoneNumber: string, env: TwilioEnv): Promise<SendOtpResult> {
	if (isBypassActive(env)) {
		return { success: true, status: 'pending' };
	}

	const url = `https://verify.twilio.com/v2/Services/${env.TWILIO_VERIFY_SERVICE_SID}/Verifications`;

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${basicAuth(env)}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({ To: phoneNumber, Channel: 'sms' })
	});

	if (!res.ok) {
		const body = await res.json<{ message?: string }>();
		throw new Error(`Twilio Verify send failed: ${body.message ?? res.statusText}`);
	}

	const data = await res.json<{ status: string }>();
	return { success: data.status === 'pending', status: data.status };
}

export interface CheckOtpResult {
	success: boolean;
	status: string;
}

export async function checkOtp(phoneNumber: string, code: string, env: TwilioEnv): Promise<CheckOtpResult> {
	if (isBypassActive(env)) {
		const valid = code === env.DEV_BYPASS_OTP;
		return { success: valid, status: valid ? 'approved' : 'rejected' };
	}

	const url = `https://verify.twilio.com/v2/Services/${env.TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`;

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${basicAuth(env)}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({ To: phoneNumber, Code: code })
	});

	if (!res.ok) {
		const body = await res.json<{ message?: string }>();
		throw new Error(`Twilio Verify check failed: ${body.message ?? res.statusText}`);
	}

	const data = await res.json<{ status: string }>();
	return { success: data.status === 'approved', status: data.status };
}
