// Raw fetch-based Twilio client — no SDK, Workers-compatible

export interface TwilioEnv {
	TWILIO_ACCOUNT_SID: string;
	TWILIO_AUTH_TOKEN: string;
	TWILIO_VERIFY_SERVICE_SID: string;
}

function basicAuth(env: TwilioEnv): string {
	return btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
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