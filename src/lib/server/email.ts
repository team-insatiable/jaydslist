interface SendEmailOptions {
	to: string;
	subject: string;
	html: string;
	apiKey: string;
	from?: string;
}

export async function sendEmail({ to, subject, html, apiKey, from }: SendEmailOptions): Promise<void> {
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
