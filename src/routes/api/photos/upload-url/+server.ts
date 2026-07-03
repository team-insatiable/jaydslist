import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDirectUploadUrl } from '$lib/server/cloudflare-images';

export const POST: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');

	try {
		const result = await getDirectUploadUrl(env);
		return json(result);
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Unknown error';
		throw error(500, `Failed to get upload URL: ${msg}`);
	}
};
