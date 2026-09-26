# Deploy on Cloudflare

This application is designed for Cloudflare Workers. A self-hosted instance must use **its own** Cloudflare resources and secrets; never deploy with the resource IDs from this repository's `wrangler.jsonc`.

## Before you begin

Have the items in the [production hoster checklist](README.md#production-hoster-checklist) ready: your Cloudflare account and domain, Twilio Verify, an email provider, and an operator email address. DBBL is optional.

## 1. Fork and configure the project

Fork the repository, clone your fork, then install dependencies:

```bash
pnpm install
```

Choose a Worker name and replace every placeholder binding in `wrangler.jsonc` with resources from your own Cloudflare account.

## 2. Provision your Cloudflare resources

Create these resources in **your** Cloudflare account:

| Resource          | Required binding             | Purpose                                                        |
| ----------------- | ---------------------------- | -------------------------------------------------------------- |
| D1 database       | `DB`                         | Accounts, listings, messages, moderation data, and migrations. |
| KV namespace      | `PHONE_VERIFICATION_KV`      | Verification challenges, typing indicators, and presence.      |
| Cloudflare Images | account ID and delivery hash | User photos and vault media.                                   |

Update the matching placeholders in `wrangler.jsonc` with your database ID, KV namespace ID, Cloudflare account ID, and Images delivery hash. Create an API token with **Images Write** permission and store it as `CF_IMAGES_API_TOKEN`. The public repository intentionally contains no live instance bindings.

## 3. Set application secrets

Set every required secret from [Configuration](configuration.md). At a minimum, production needs `BETTER_AUTH_SECRET`, `CONTACT_ENCRYPTION_KEY`, Twilio credentials, `PHONE_PEPPER`, `ADMIN_EMAILS`, and your email-provider credentials. DBBL settings are optional and disabled by default.

Use interactive commands so values do not enter shell history:

```bash
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put CONTACT_ENCRYPTION_KEY
pnpm exec wrangler secret put ADMIN_EMAILS
```

Do **not** set `DEV_BYPASS_OTP` in production.

## 4. Apply database migrations

After updating the D1 binding in `wrangler.jsonc`, apply the migrations to your remote database:

```bash
pnpm exec wrangler d1 migrations apply YOUR_DATABASE_NAME --remote
```

Do not run `pnpm seed` against a production database.

## 5. Deploy and attach your domain

Deploy the Worker using your normal release command. Then attach your controlled domain or subdomain in the Cloudflare Workers dashboard, set `ORIGIN` to its public HTTPS URL, and redeploy after changing that setting.

## 6. Validate before inviting users

1. Register a test account and complete real phone verification.
2. Create a test listing, upload a photo, and send a message from a second account.
3. Request a password reset and confirm email arrives from your verified sender.
4. Confirm an operator in `ADMIN_EMAILS` can access `/admin`.
5. Review your public rules, privacy contact address, and moderation workflow.
