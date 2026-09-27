import { localPhotos } from '$lib/server/local-photos';
import { getConfig } from '$lib/server/config';
export type ContentRating = 'safe' | 'nsfw' | 'unknown';
type Label = { Name: string; Confidence: number; ParentName?: string };

// AWS v7 puts explicit nudity, sexual activity, and sex toys under Explicit.
// Non-explicit nudity (including shirtless photos), kissing, and swimwear are allowed.
export function classifyLabels(labels: Label[], nsfwConfidence = 80): ContentRating {
	const explicit = labels.filter(
		(label) =>
			[
				'Explicit',
				'Explicit Nudity',
				'Explicit Sexual Activity',
				'Sex Toys',
				'Exposed Female Nipple',
				'Exposed Buttocks or Anus',
				'Exposed Male Genitalia',
				'Exposed Female Genitalia'
			].includes(label.Name) || label.ParentName === 'Explicit'
	);
	if (explicit.some((label) => label.Confidence >= nsfwConfidence)) return 'nsfw';
	if (explicit.length) return 'unknown';
	return 'safe';
}

const encoder = new TextEncoder();
const hex = (value: ArrayBuffer) =>
	Array.from(new Uint8Array(value), (b) => b.toString(16).padStart(2, '0')).join('');
async function hash(value: string) {
	return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}
async function hmac(key: string | ArrayBuffer, value: string) {
	const imported = await crypto.subtle.importKey(
		'raw',
		typeof key === 'string' ? encoder.encode(key) : key,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	return crypto.subtle.sign('HMAC', imported, encoder.encode(value));
}

export async function screenPhoto(
	env: Env,
	file: Blob,
	simulatedRating: string = 'safe'
): Promise<ContentRating> {
	if (localPhotos) {
		if (!['safe', 'nsfw', 'unknown'].includes(simulatedRating))
			throw new Error('Invalid simulated photo rating');
		return simulatedRating as ContentRating;
	}
	if (!env.REKOGNITION_ACCESS_KEY_ID || !env.REKOGNITION_SECRET_ACCESS_KEY)
		throw new Error('Photo screening is not configured');
	if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024)
		throw new Error('Photo screening requires a JPEG or PNG up to 5MB');
	const bytes = new Uint8Array(await file.arrayBuffer());
	let binary = '';
	for (let offset = 0; offset < bytes.length; offset += 8192)
		binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
	const [nsfwValue, reviewValue] = await Promise.all([
		getConfig('PHOTO_NSFW_CONFIDENCE', env, env.DB),
		getConfig('PHOTO_REVIEW_CONFIDENCE', env, env.DB)
	]);
	const nsfwConfidence = Number(nsfwValue);
	const reviewConfidence = Number(reviewValue);
	if (
		!Number.isFinite(nsfwConfidence) ||
		!Number.isFinite(reviewConfidence) ||
		reviewConfidence < 0 ||
		nsfwConfidence > 100 ||
		reviewConfidence >= nsfwConfidence
	)
		throw new Error('Invalid photo screening thresholds');
	const payload = JSON.stringify({
		Image: { Bytes: btoa(binary) },
		MinConfidence: reviewConfidence
	});
	const region = env.REKOGNITION_REGION ?? 'us-east-1';
	if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) throw new Error('Invalid screening region');
	const host = `rekognition.${region}.amazonaws.com`;
	const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
	const date = timestamp.slice(0, 8);
	const headers: Record<string, string> = {
		'content-type': 'application/x-amz-json-1.1',
		host,
		'x-amz-date': timestamp,
		'x-amz-target': 'RekognitionService.DetectModerationLabels'
	};
	if (env.REKOGNITION_SESSION_TOKEN)
		headers['x-amz-security-token'] = env.REKOGNITION_SESSION_TOKEN;
	const names = Object.keys(headers).sort();
	const canonical = [
		'POST',
		'/',
		'',
		names.map((name) => `${name}:${headers[name].trim()}`).join('\n') + '\n',
		names.join(';'),
		await hash(payload)
	].join('\n');
	const scope = `${date}/${region}/rekognition/aws4_request`;
	const signingKey = await hmac(
		await hmac(
			await hmac(await hmac(`AWS4${env.REKOGNITION_SECRET_ACCESS_KEY}`, date), region),
			'rekognition'
		),
		'aws4_request'
	);
	const signature = hex(
		await hmac(signingKey, ['AWS4-HMAC-SHA256', timestamp, scope, await hash(canonical)].join('\n'))
	);
	const response = await fetch(`https://${host}/`, {
		method: 'POST',
		headers: {
			...headers,
			Authorization: `AWS4-HMAC-SHA256 Credential=${env.REKOGNITION_ACCESS_KEY_ID}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}`
		},
		body: payload,
		signal: AbortSignal.timeout(15000)
	});
	if (!response.ok) throw new Error('Photo screening failed');
	const result = (await response.json()) as { ModerationLabels?: Label[] };
	if (
		!Array.isArray(result.ModerationLabels) ||
		result.ModerationLabels.some(
			(label) =>
				typeof label.Name !== 'string' ||
				!Number.isFinite(label.Confidence) ||
				label.Confidence < 0 ||
				label.Confidence > 100
		)
	)
		throw new Error('Invalid photo screening response');
	return classifyLabels(result.ModerationLabels, nsfwConfidence);
}

export function canReceivePhoto(rating: string, allowsNsfw: boolean): boolean {
	return rating === 'safe' || (rating === 'nsfw' && allowsNsfw);
}
