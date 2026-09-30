# Deploy on Cloudflare

This application is designed for Cloudflare Workers. A self-hosted instance must use **its own** Cloudflare resources and secrets; never deploy with the resource IDs from this repository's `wrangler.jsonc`.

## Before you begin

Have the items in the [production hoster checklist](README.md#production-hoster-checklist) ready: your Cloudflare account and domain, Twilio Verify and Lookup, an email provider, and an operator email address.

## 1. Keep your instance separate from the application

Use this public repository for application code and a separate, operator-owned repository for your instance files. The instance repository should usually be private because its configuration identifies your Cloudflare resources, although it must never contain secrets. A fork is only necessary if you intend to change application code.

An instance repository can have this structure:

```text
wrangler.jsonc
content/about.md
content/rules.md
content/privacy.md
content/terms.md
static/logo.png
content/email-templates.ts  # optional
```

Copy `wrangler.jsonc` from upstream into your instance repository and replace the placeholder bindings and public settings with resources and values from your own Cloudflare account. Choose a Worker name. Keep credentials in Cloudflare Worker secrets, not in this file or Git.

Supply the four Markdown policies in `content/`. The upstream files are neutral placeholders, not ready-to-use policies. Your content may use `{{INSTANCE_NAME}}`, `{{INSTANCE_URL}}`, and `{{LEGAL_EMAIL}}`; the application replaces those with your configured instance values. Review Terms and Privacy content for your jurisdiction and actual data practices.

Put your square PNG in `static/logo.png`. The app, favicon, notifications, and transactional emails use this one asset. Optionally include `content/email-templates.ts` to customize email copy; preserve its exported keys and required action URL placeholders. See [Email delivery](email.md#branding-and-templates).

For each deployment, check out a chosen upstream release or commit SHA and your instance repository:

```bash
git clone https://github.com/team-insatiable/jaydslist.git app
git -C app checkout YOUR_REVIEWED_UPSTREAM_REF
git clone YOUR_INSTANCE_REPOSITORY_URL instance
```

Copy your instance files over the upstream checkout before building:

```bash
cp instance/wrangler.jsonc app/wrangler.jsonc
cp instance/content/{about,rules,privacy,terms}.md app/src/lib/instance-content/
cp instance/static/logo.png app/static/logo.png
if [ -f instance/content/email-templates.ts ]; then
  cp instance/content/email-templates.ts app/src/lib/instance-content/email-templates.ts
fi
```

Here `instance/` is your operator repository and `app/` is a checkout of this upstream repository. Your deployment workflow can perform these same steps. To upgrade, choose a newer upstream revision, review its configuration and migrations, test it, and deploy with the same instance files. Do not automatically move production to a changing upstream branch; see [Operations and upgrades](operations.md#before-each-release).

Run `pnpm install --frozen-lockfile` in `app/` before using Wrangler in the steps below.

## 2. Provision your Cloudflare resources

Create these resources in **your** Cloudflare account:

| Resource          | Required binding             | Purpose                                                        |
| ----------------- | ---------------------------- | -------------------------------------------------------------- |
| D1 database       | `DB`                         | Accounts, listings, messages, moderation data, and migrations. |
| KV namespace      | `PHONE_VERIFICATION_KV`      | Verification challenges, typing indicators, and presence.      |
| Cloudflare Images | account ID and delivery hash | User photos and vault media.                                   |

Update the matching placeholders in your instance's `wrangler.jsonc` with your database ID, KV namespace ID, Cloudflare account ID, and Images delivery hash. Create an API token with **Images Write** permission and store it as `CF_IMAGES_API_TOKEN`. The public repository intentionally contains no live instance bindings.

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

After overlaying the instance configuration and confirming the selected Cloudflare account with `pnpm exec wrangler whoami`, apply the migrations to your remote database:

```bash
pnpm exec wrangler d1 migrations apply YOUR_DATABASE_NAME --remote
```

Do not run `pnpm seed` against a production database.

## 5. Deploy and attach your domain

After overlaying your instance files, generate Worker types, build, confirm the selected Cloudflare account with `pnpm exec wrangler whoami`, and deploy:

```bash
pnpm gen
pnpm build
pnpm exec wrangler whoami
pnpm exec wrangler deploy
```

Attach your domain or subdomain in the Cloudflare Workers dashboard. Set `ORIGIN` and `INSTANCE_URL` to its public HTTPS URL. `ORIGIN` controls authentication URLs; `INSTANCE_URL` supplies public policy links. Configure `INSTANCE_NAME`, `INSTANCE_TAGLINE`, `INSTANCE_LEGAL_EMAIL`, and `INSTANCE_SOURCE_URL` as well. Redeploy after changing configuration.

## 6. Validate before inviting users

1. Register a test account and complete real phone verification.
2. Create a test listing, upload a photo, and send a message from a second account.
3. Request a password reset and confirm email arrives from your verified sender.
4. Confirm an operator in `ADMIN_EMAILS` can access `/admin`.
5. Review your public rules, privacy contact address, and moderation workflow.
