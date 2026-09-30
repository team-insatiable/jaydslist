import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Keep image links in emails sent by older versions working after an upgrade.
export const GET: RequestHandler = () => redirect(308, '/logo.png');
