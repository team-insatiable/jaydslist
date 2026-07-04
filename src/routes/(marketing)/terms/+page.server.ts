import { DEFAULT_CONFIG } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		instanceName: DEFAULT_CONFIG.INSTANCE_NAME,
		instanceUrl: DEFAULT_CONFIG.INSTANCE_URL
	};
};
