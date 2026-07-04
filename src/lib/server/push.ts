// Web Crypto-based Web Push (RFC 8291 + RFC 8292 VAPID)
// No Node.js crypto — runs natively in Cloudflare Workers

function b64u(buf: ArrayBuffer | Uint8Array): string {
	const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromB64u(s: string): Uint8Array {
	const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
	const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=');
	const bin = atob(padded);
	return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const key = await (crypto.subtle as any).importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const bits = await (crypto.subtle as any).deriveBits(
		{ name: 'HKDF', hash: 'SHA-256', salt, info },
		key,
		length * 8
	) as ArrayBuffer;
	return new Uint8Array(bits);
}

async function encryptPayload(plaintext: string, p256dhB64u: string, authB64u: string): Promise<Uint8Array> {
	const enc = new TextEncoder();
	const subscriberKey = fromB64u(p256dhB64u); // 65-byte uncompressed P-256 point
	const authSecret = fromB64u(authB64u);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const subtle = crypto.subtle as any;
	const serverKeyPair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
	const serverPublicRaw = new Uint8Array(await subtle.exportKey('raw', serverKeyPair.publicKey) as ArrayBuffer);

	const subscriberCryptoKey = await subtle.importKey(
		'raw', subscriberKey, { name: 'ECDH', namedCurve: 'P-256' }, false, []
	) as CryptoKey;
	const sharedSecret = new Uint8Array(
		await subtle.deriveBits({ name: 'ECDH', public: subscriberCryptoKey }, serverKeyPair.privateKey, 256) as ArrayBuffer
	);

	const salt = crypto.getRandomValues(new Uint8Array(16));

	// IKM = HKDF(salt=auth_secret, ikm=shared_secret, info="WebPush: info\0"||sub_key||server_key, 32)
	const keyInfo = new Uint8Array(15 + 65 + 65);
	keyInfo.set(enc.encode('WebPush: info\x00'), 0);
	keyInfo.set(subscriberKey, 15);
	keyInfo.set(serverPublicRaw, 80);
	const ikm = await hkdf(authSecret, sharedSecret, keyInfo, 32);

	const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\x00'), 16);
	const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\x00'), 12);

	const plaintextBytes = enc.encode(plaintext);
	const padded = new Uint8Array(plaintextBytes.length + 1);
	padded.set(plaintextBytes);
	padded[plaintextBytes.length] = 2; // aes128gcm last-record delimiter

	const aesKey = await subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']) as CryptoKey;
	const ciphertext = new Uint8Array(
		await subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded) as ArrayBuffer
	);

	// aes128gcm content-encoding header: salt(16) || rs(4) || keyid_len(1) || server_key(65)
	const header = new Uint8Array(86);
	header.set(salt, 0);
	new DataView(header.buffer).setUint32(16, 4096, false); // rs=4096, big-endian
	header[20] = 65;
	header.set(serverPublicRaw, 21);

	const result = new Uint8Array(86 + ciphertext.length);
	result.set(header);
	result.set(ciphertext, 86);
	return result;
}

async function buildVapidJwt(
	audience: string,
	contact: string,
	pubB64u: string,
	privB64u: string
): Promise<string> {
	const pubBytes = fromB64u(pubB64u); // 65 bytes: 0x04 || x(32) || y(32)
	const x = b64u(pubBytes.slice(1, 33));
	const y = b64u(pubBytes.slice(33, 65));

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const subtle = crypto.subtle as any;
	const sigKey = await subtle.importKey(
		'jwk',
		{ kty: 'EC', crv: 'P-256', d: privB64u, x, y, key_ops: ['sign'] },
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['sign']
	) as CryptoKey;

	const enc = new TextEncoder();
	const now = Math.floor(Date.now() / 1000);
	const header = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
	const payload = b64u(enc.encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: contact })));
	const sig = await subtle.sign(
		{ name: 'ECDSA', hash: 'SHA-256' },
		sigKey,
		enc.encode(`${header}.${payload}`)
	) as ArrayBuffer;

	return `${header}.${payload}.${b64u(sig)}`;
}

export async function sendPushNotification(
	subscription: { endpoint: string; p256dh: string; auth: string },
	payload: { title: string; body: string; url: string },
	env: { VAPID_PUBLIC_KEY: string; VAPID_PRIVATE_KEY: string; VAPID_CONTACT: string }
): Promise<{ stale: boolean }> {
	const url = new URL(subscription.endpoint);
	const audience = `${url.protocol}//${url.host}`;

	const [jwt, encrypted] = await Promise.all([
		buildVapidJwt(audience, env.VAPID_CONTACT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY),
		encryptPayload(JSON.stringify(payload), subscription.p256dh, subscription.auth)
	]);

	const res = await fetch(subscription.endpoint, {
		method: 'POST',
		headers: {
			Authorization: `vapid t=${jwt},k=${env.VAPID_PUBLIC_KEY}`,
			'Content-Type': 'application/octet-stream',
			'Content-Encoding': 'aes128gcm',
			TTL: '60'
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		body: encrypted as any
	});

	return { stale: res.status === 410 };
}
