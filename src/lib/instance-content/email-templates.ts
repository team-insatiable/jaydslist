/**
 * Public email copy. Operators may replace this file at build time.
 * Values in {{double braces}} are HTML-escaped by the renderer.
 * Optional sections use {{#if value}}...{{/if}} (no nesting).
 */
const emailTemplates = {
	passwordReset: {
		subject: 'Reset your {{instanceName}} password',
		html: `
			<p>Click the link below to reset your {{instanceName}} password. This link expires in 1 hour.</p>
			<p><a href="{{resetUrl}}">Reset password</a></p>
			<p>If you did not request this, you can ignore this email.</p>
		`
	},
	betaConfirm: {
		subject: 'Confirm your {{instanceName}} beta signup',
		html: `
			<p>Confirm that you want beta updates from {{instanceName}}.</p>
			<p><a href="{{confirmUrl}}">Confirm beta signup</a></p>
			<p>This link expires in 24 hours. If you did not request this, you can ignore this email.</p>
		`
	},
	betaWelcome: {
		subject: 'You’re on the {{instanceName}} beta list',
		html: `<p>You’re confirmed for the {{instanceName}} beta. We’ll email you when there is news to share.</p>`
	},
	newMessage: {
		subject: 'New message from {{fromAlias}}',
		html: `
			<p>You have a new message from <strong>{{fromAlias}}</strong> regarding <em>“{{listingSubject}}”</em>.</p>
			{{#if preview}}<blockquote style="border-left:3px solid #ccc;padding-left:1em;color:#555">{{preview}}</blockquote>{{/if}}
			<p><a href="{{threadUrl}}">View thread →</a></p>
			<p style="font-size:0.85em;color:#666">Do not share personal contact info by email — use the contact exchange feature inside the thread.</p>
		`
	},
	listingSuspended: {
		subject: 'Your listing has been suspended',
		html: `
			<p>Your listing <strong>“{{listingSubject}}”</strong> has been suspended by a moderator.</p>
			{{#if reason}}<p><strong>Reason:</strong> {{reason}}</p>{{/if}}
			<p>Please edit your listing to address the issue. Once you save your changes, the listing will be reactivated automatically.</p>
			<p><em>If you believe this was in error, you can reply to this email.</em></p>
		`
	},
	accountWarning: {
		subject: 'Warning issued on your {{instanceName}} account',
		html: `
			<p>Your account has received a warning from a {{instanceName}} moderator.</p>
			{{#if reason}}<p><strong>Reason:</strong> {{reason}}</p>{{/if}}
			<p>Please review the <a href="{{rulesUrl}}">community guidelines</a>. Further violations may result in account suspension.</p>
			<p><em>If you believe this was in error, you can reply to this email.</em></p>
		`
	},
	abuseAlert: {
		subject: '[{{instanceName}}] Auto-suspension: {{alias}}',
		html: `
			<p><strong>Auto-suspension triggered</strong></p>
			<p>User <strong>{{alias}}</strong> (ID: <code>{{userId}}</code>) was automatically suspended.</p>
			<p><strong>Reason:</strong> {{reason}}</p>
			<p><strong>Count:</strong> {{count}}</p>
			{{#if threadUrl}}<p><a href="{{threadUrl}}">View thread</a></p>{{/if}}
			<p><a href="{{adminUrl}}">Open admin panel</a></p>
		`
	}
} as const;

export default emailTemplates;
