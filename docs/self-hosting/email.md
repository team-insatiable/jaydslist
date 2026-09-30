# Email delivery

Jaydslist uses one email interface for password resets, inbox notifications, moderation notices, abuse alerts, and beta waitlist confirmation. Choose a provider with `EMAIL_PROVIDER`.

## Amazon SES

Set these values in `.dev.vars` locally or as Worker secrets in production:

```dotenv
EMAIL_PROVIDER=ses
EMAIL_FROM="Jaydslist <notifications@your-domain.example>"
SES_ACCESS_KEY_ID=AKIA...
SES_SECRET_ACCESS_KEY=...
SES_REGION=us-west-2
```

Use an **IAM access key pair**, not Amazon SES SMTP credentials. The IAM identity needs `ses:SendEmail`. Temporary AWS credentials also require `SES_SESSION_TOKEN`.

The domain or sender in `EMAIL_FROM` must be a verified SES identity in the same `SES_REGION`. A custom MAIL FROM domain controls the bounce/return-path domain; it does not change the visible `From:` address.

## Resend

```dotenv
EMAIL_PROVIDER=resend
EMAIL_FROM="Jaydslist <notifications@your-domain.example>"
RESEND_API_KEY=re_...
```

If `EMAIL_PROVIDER` is omitted, an existing `RESEND_API_KEY` continues to select Resend for backward compatibility.

## Branding and templates

Every transactional email uses a shared layout and the configured `INSTANCE_NAME`. The logo is fetched from `/email-logo.png` on the instance's own `INSTANCE_URL`; no separate logo setting or Cloudflare Images upload is needed. Replace `static/email-logo.png` with your own square PNG when customizing your instance's visual identity. The upstream file contains the Jaydslist mark, so replace it before inviting users if your instance has a different logo. Email clients may block remote images, so the instance name always appears as text alongside the logo. Local HTTP development uses name-only branding.

If you already host a public logo elsewhere, such as a public Cloudflare Images variant, you may set `INSTANCE_EMAIL_LOGO_URL` to its absolute HTTPS URL. Do not use a private user-photo URL or a signed URL that expires; email clients fetch images later and without an application session. An invalid override falls back to the instance's `/email-logo.png` asset.

The default subjects and message bodies live in [`src/lib/instance-content/email-templates.ts`](../../src/lib/instance-content/email-templates.ts). A private instance repository may keep a copy at `content/email-templates.ts` and overlay it at the same source path before building, as it does for policy Markdown. Edit the subject and HTML for each message type while preserving the exported object keys and any required action URL placeholder. Template values use `{{name}}` placeholders, which the renderer escapes for HTML and attributes. Optional sections use `{{#if name}}...{{/if}}` without nesting. Available shared values are `instanceName`, `instanceUrl`, `legalEmail`, and `rulesUrl`; each template shows its event-specific values. An unknown placeholder fails rendering so a typo cannot silently remove a link or detail. Do not put credentials, recipient data, or instance secrets into the template file.

Password reset and beta confirmation messages must retain `{{resetUrl}}` and `{{confirmUrl}}` respectively. Test customized templates using a real delivery to a test mailbox after each change, including image rendering with remote images blocked.

## Test delivery

Restart `pnpm dev` after editing `.dev.vars`, then request a password reset for an email address belonging to a local account. Development mode sends email normally.

To test an inbox notification, create a listing with Account A and use Account B to send the first message. The listing owner should receive the notification.

If SES rejects a request, the development terminal includes the AWS error. Common causes are swapped access-key values, an unverified sender, an incorrect region, missing `ses:SendEmail`, or a missing `SES_SESSION_TOKEN` for temporary credentials.
