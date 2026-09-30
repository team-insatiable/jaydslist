# Deploy on Cloudflare

This application is designed for Cloudflare Workers. A self-hosted instance must use **its own** Cloudflare resources and secrets; never deploy with the resource IDs from this repository's `wrangler.jsonc`.

## Before you begin

Have the items in the [production hoster checklist](README.md#production-hoster-checklist) ready: your Cloudflare account and domain, Twilio Verify and Lookup, an email provider, and an operator email address.

## 1. Fork and configure the project

Fork the repository, clone your fork, then install dependencies:

```bash
pnpm install
```

Choose a Worker name and replace every placeholder binding in `wrangler.jsonc` with resources from your own Cloudflare account.

## Instance policy content

Create a private instance-configuration repository alongside your fork. It must contain these
four public Markdown files:

```text
content/about.md
content/rules.md
content/privacy.md
content/terms.md
```

During deployment, copy them over `src/lib/instance-content/` in the upstream checkout before
building. The supplied upstream files are neutral placeholders, not legal policies. Your content
may use `{{INSTANCE_NAME}}`, `{{INSTANCE_URL}}`, and `{{LEGAL_EMAIL}}`; the application replaces those
with your configured instance values. Review Terms and Privacy content for your jurisdiction and
actual data practices.

Optionally overlay `content/email-templates.ts` onto `src/lib/instance-content/email-templates.ts` to customize transactional email copy. See [Email delivery](email.md#branding-and-templates). Keep the same template keys and required action URL placeholders.

## 2. Provision your Cloudflare resources

Create these resources in **your** Cloudflare account:

| Resource          | Required binding             | Purpose                                                        |
| ----------------- | ---------------------------- | -------------------------------------------------------------- |
| D1 database       | `DB`                         | Accounts, listings, messages, moderation data, and migrations. |
| KV namespace      | `PHONE_VERIFICATION_KV`      | Verification challenges, typing indicators, and presence.      |
| Cloudflare Images | account ID and delivery hash | User photos and vault media.                                   |

Update the matching placeholders in `wrangler.jsonc` with your database ID, KV namespace ID, Cloudflare account ID, and Images delivery hash. Create an API token with **Images Write** permission and store it as `CF_IMAGES_API_TOKEN`. The public repository intentionally contains no live instance bindings.

## 3. Set application secrets

Set every required secret from [Configuration](configuration.md). At a minimum, production needs `BETTER_AUTH_SECRET`, `CONTACT_ENCRYPTION_KEY`, Twilio credentials, `PHONE_PEPPER`, `ADMIN_EMAILS`, and your email-provider credentials. Leave optional integrations disabled unless you deliberately configure and test them.

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

After overlaying your instance configuration and policy files, build and deploy:

```bash
pnpm gen
pnpm build
pnpm exec wrangler deploy
```

Attach your domain or subdomain in the Cloudflare Workers dashboard. Set `ORIGIN` and `INSTANCE_URL` to its public HTTPS URL. `ORIGIN` controls authentication URLs; `INSTANCE_URL` supplies public policy links. Configure `INSTANCE_NAME`, `INSTANCE_TAGLINE`, `INSTANCE_LEGAL_EMAIL`, and `INSTANCE_SOURCE_URL` as well. Redeploy after changing configuration.

## 6. Validate before inviting users

1. Register a test account and complete real phone verification.
2. Create a test listing, upload a photo, and send a message from a second account.
3. Request a password reset and confirm email arrives from your verified sender.
4. Confirm an operator in `ADMIN_EMAILS` can access `/admin`.
5. Review your public rules, privacy contact address, and moderation workflow.
