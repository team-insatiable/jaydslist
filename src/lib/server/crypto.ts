const ALGO = { name: 'AES-GCM', length: 256 } as const;

async function importKey(base64Key: string): Promise<CryptoKey> {
	const raw = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
	return crypto.subtle.importKey('raw', raw, ALGO, false, ['encrypt', 'decrypt']);
}

export async function encryptContact(value: string, base64Key: string): Promise<string> {
	const key = await importKey(base64Key);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		new TextEncoder().encode(value)
	);
	const ivB64 = btoa(String.fromCharCode(...iv));
	const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
	return `${ivB64}:${ctB64}`;
}

export async function decryptContact(encrypted: string, base64Key: string): Promise<string> {
	const [ivB64, ctB64] = encrypted.split(':');
	const key = await importKey(base64Key);
	const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
	const ciphertext = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));
	const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
	return new TextDecoder().decode(decrypted);
}
