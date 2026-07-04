import { redirect, json } from '@sveltejs/kit';

export function requirePhoneVerifiedRedirect(locals: App.Locals): void {
	if (!locals.user) throw redirect(302, '/login');
	if (!locals.phoneVerified) throw redirect(302, '/verify-phone');
}

export function requirePhoneVerifiedApi(locals: App.Locals): Response | null {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!locals.phoneVerified) {
		return json({ error: 'Phone verification required' }, { status: 403 });
	}
	return null;
}
