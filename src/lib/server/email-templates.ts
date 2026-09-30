import emailTemplates from '$lib/instance-content/email-templates';
import { escapeEmailHtml } from './email-html';
import { getInstanceConfig } from './instance';

export type EmailTemplateName = keyof typeof emailTemplates;

function renderFields(template: string, values: Record<string, string>, escape: boolean): string {
	const withoutEmptySections = template.replace(
		/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g,
		(_match, field: string, contents: string) => {
			if (!(field in values)) throw new Error(`Unknown email template field: ${field}`);
			return values[field] ? contents : '';
		}
	);
	return withoutEmptySections.replace(/{{(\w+)}}/g, (_match, field: string) => {
		if (!(field in values)) throw new Error(`Unknown email template field: ${field}`);
		const value = values[field];
		return escape ? escapeEmailHtml(value) : value.replace(/[\r\n]+/g, ' ');
	});
}

function publicHttpsUrl(candidate: string): string | null {
	try {
		const url = new URL(candidate);
		return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
	} catch {
		return null;
	}
}

function logoUrl(env: Partial<Env>, instanceUrl: string): string | null {
	const override = env.INSTANCE_EMAIL_LOGO_URL?.trim();
	if (override) {
		const customUrl = publicHttpsUrl(override);
		if (customUrl) return customUrl;
	}
	try {
		return publicHttpsUrl(new URL('/logo.png', instanceUrl).toString());
	} catch {
		return null;
	}
}

/** Render an operator-editable template in the shared email layout. */
export function renderInstanceEmail(
	env: Partial<Env>,
	name: EmailTemplateName,
	fields: Record<string, string> = {}
): { subject: string; html: string } {
	const instance = getInstanceConfig(env);
	const values = {
		...fields,
		instanceName: instance.name,
		instanceUrl: instance.url,
		legalEmail: instance.legalEmail,
		rulesUrl: `${instance.url.replace(/\/$/, '')}/rules`
	};
	const template = emailTemplates[name];
	const requiredActionUrl =
		name === 'passwordReset' ? 'resetUrl' : name === 'betaConfirm' ? 'confirmUrl' : null;
	if (requiredActionUrl && !template.html.includes(`{{${requiredActionUrl}}}`))
		throw new Error(`Email template ${name} must include {{${requiredActionUrl}}}`);
	const subject = renderFields(template.subject, values, false)
		.replace(/[\r\n]+/g, ' ')
		.trim();
	const body = renderFields(template.html, values, true);
	const logo = logoUrl(env, instance.url);
	const brand = logo
		? `<img src="${escapeEmailHtml(logo)}" alt="${escapeEmailHtml(instance.name)} logo" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:contain;margin-bottom:12px" />`
		: '';
	const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f5f5;color:#222;font-family:Arial,Helvetica,sans-serif;line-height:1.5"><div style="max-width:600px;margin:0 auto;padding:24px;background:#fff;border:1px solid #ddd;border-radius:8px"><a href="${escapeEmailHtml(instance.url)}" style="color:#222;text-decoration:none">${brand}<strong style="font-size:20px">${escapeEmailHtml(instance.name)}</strong></a><div style="margin-top:24px">${body}</div><hr style="border:0;border-top:1px solid #ddd;margin:28px 0 16px" /><p style="margin:0;color:#666;font-size:12px">${escapeEmailHtml(instance.name)}</p></div></body></html>`;
	return { subject, html };
}
