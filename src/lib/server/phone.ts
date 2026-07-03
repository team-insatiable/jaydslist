/**
 * Normalize a phone number to E.164 format.
 * Returns null if the number can't be normalized (too short, etc.).
 *
 * Rules per CLAUDE.md:
 *   10 digits          → prepend +1
 *   11 digits, starts 1 → prepend +
 *   otherwise          → prepend + and hope for the best
 */
export function normalizeE164(phone: string): string | null {
	const digits = phone.replace(/\D/g, '');
	if (digits.length < 10) return null;
	if (digits.length === 10) return `+1${digits}`;
	if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
	return `+${digits}`;
}

async function sha256(input: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/** Peppered hash for local DB storage — not shareable cross-platform. */
export async function hashPhoneLocal(phone: string, pepper: string): Promise<string> {
	return sha256(phone + pepper);
}

/** Plain E.164 SHA256 — no pepper — for DBBL cross-platform consistency. */
export async function hashPhoneForDbbl(phone: string): Promise<string> {
	return sha256(phone);
}

/** Lowercase + trim before hashing — for DBBL cross-platform consistency. */
export async function hashEmailForDbbl(email: string): Promise<string> {
	return sha256(email.toLowerCase().trim());
}
