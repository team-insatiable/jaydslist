import { getInstanceConfig } from '$lib/server/instance';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => ({
	instanceName: getInstanceConfig(platform?.env).name,
	sourceUrl: getInstanceConfig(platform?.env).sourceUrl,
	docsUrl: `${getInstanceConfig(platform?.env).sourceUrl.replace(/\/$/, '')}/blob/main/docs/self-hosting/README.md`
});
