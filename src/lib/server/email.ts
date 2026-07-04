interface SendEmailOptions {
	to: string;
	subject: string;
	html: string;
	apiKey: string;
	from?: string;
}

export async function sendEmail({
	to,
	subject,
	html,
	apiKey,
	from
}: SendEmailOptions): Promise<void> {
	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: from ?? 'Jaydslist <onboarding@resend.dev>',
			to: [to],
			subject,
			html
		})
	});

	if (!res.ok) {
		const body = await res.text();
		console.error(`Resend error ${res.status}: ${body}`);
	}
}

export function listingFlaggedEmail(subject: string, reason: string | null): string {
	return `
		<p>Your listing <strong>"${subject}"</strong> has been suspended by a moderator.</p>
		${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
		<p>Please edit your listing to address the issue. Once you save your changes, the listing will be reactivated automatically.</p>
		<p><em>If you believe this was in error, you can reply to this email.</em></p>
	`;
}

export function userWarnedEmail(reason: string | null): string {
	return `
		<p>Your account has received a warning from a Jaydslist moderator.</p>
		${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
		<p>Please review the <a href="https://jaydslist.com/guidelines">community guidelines</a>. Further violations may result in account suspension.</p>
		<p><em>If you believe this was in error, you can reply to this email.</em></p>
	`;
}

export async function sendNewMessageEmail(
	to: string,
	fromAlias: string,
	listingSubject: string,
	preview: string,
	threadUrl: string,
	apiKey: string
): Promise<void> {
	const safePreview = preview.slice(0, 150) + (preview.length > 150 ? '…' : '');
	await sendEmail({
		to,
		subject: `New message from ${fromAlias}`,
		html: `
			<p>You have a new message from <strong>${fromAlias}</strong> regarding <em>"${listingSubject}"</em>.</p>
			${safePreview ? `<blockquote style="border-left:3px solid #ccc;padding-left:1em;color:#555">${safePreview}</blockquote>` : ''}
			<p><a href="${threadUrl}">View thread →</a></p>
			<p style="font-size:0.85em;color:#888">Do not share personal contact info by email — use the contact exchange feature inside the thread.</p>
		`,
		apiKey
	});
}

export async function sendAbuseAlertEmail(
	adminEmails: string[],
	details: { alias: string; userId: string; reason: string; count: number; threadUrl?: string },
	origin: string,
	apiKey: string
): Promise<void> {
	const { alias, userId, reason, count, threadUrl } = details;
	const html = `
		<p><strong>Auto-suspension triggered</strong></p>
		<p>User <strong>${alias}</strong> (ID: <code>${userId}</code>) was automatically suspended.</p>
		<p><strong>Reason:</strong> ${reason}</p>
		<p><strong>Count:</strong> ${count}</p>
		${threadUrl ? `<p><a href="${threadUrl}">View thread</a></p>` : ''}
		<p><a href="${origin}/admin">Open admin panel</a></p>
	`;
	for (const email of adminEmails) {
		await sendEmail({ to: email, subject: `[Jaydslist] Auto-suspension: ${alias}`, html, apiKey });
	}
}
