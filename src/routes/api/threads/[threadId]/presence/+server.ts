import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const env = platform?.env;
	if (!env) throw error(500, 'Server configuration error');

	await env.PHONE_VERIFICATION_KV.put(
		`presence:${params.threadId}:${locals.user.id}`,
		String(Date.now())
	);

	return new Response(null, { status: 204 });
};
