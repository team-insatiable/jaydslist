# Jaydslist

A privacy-focused, classifieds-style personals platform. No ads and no swipe-based feed — just people and their words.

## What it is

Jaydslist is a modern classifieds-style personals platform focused on casual encounters and genuine connection. It is phone-verified, mobile-first, and designed entirely around the user experience rather than engagement metrics or monetization.

## Core values

**Privacy first.** Listings show approximate distances and general areas, not precise coordinates. Contact information is shared through a mutual-consent exchange. The database stores both a peppered phone hash for duplicate-number checks and an encrypted phone number for contact exchange; it is not hash-only storage.

**Phone-verified access.** Registration uses email and password; phone verification is required to enter the application. Twilio Lookup rejects numbers classified as VoIP. Phone verification establishes access to a number—not someone's identity, age, or trustworthiness.

**Boundaries over volume.** First messages have a minimum length, a daily new-conversation limit, and checks for contact details that should use the exchange flow. Reporting and blocking tools support moderation. There is no general-purpose automated filter that reliably detects copied openers, disrespectful content, or spam.

**Ad-free by design.** Browsing, posting, messaging, and contact exchange are available to free accounts. The current implementation gates photo albums/listing photos and privacy mode on supporter status, and supporter status changes some listing limits. This design is under review. Stripe billing, subscriptions, and donation collection are not implemented.

**Built for users, not profit.** Every design decision prioritizes the person using the platform. There are no dark patterns, no engagement traps, no manufactured urgency. The goal is for people to connect and leave — not to maximize time on site.

**Open source.** Jaydslist is AGPL licensed. The code is public, the data model is transparent, and operators can run their own instances.

## Self-hosting

Contributions and bug reports are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the issue workflow and private security reporting path.

Jaydslist is designed for independent Cloudflare Workers deployments. Each operator supplies
their own domain, Cloudflare account, D1 database, KV namespace, Cloudflare Images account,
Twilio Verify service, email provider, and moderation/legal process. Do not reuse another
instance's resource IDs or secrets.

### Run locally

```bash
pnpm install
cp .dev.vars.example .dev.vars
pnpm exec wrangler d1 migrations apply DB --local
pnpm dev
```

Set a high-entropy `BETTER_AUTH_SECRET` in `.dev.vars`. For local phone verification only,
set a non-production `DEV_BYPASS_OTP`; never deploy that bypass. `pnpm seed` can add sample
data, but it deletes and recreates the local D1 database first.

### Deploy your own instance

Keep an operator-owned instance repository for your configuration, policies, logo, and optional email templates. Deploy a chosen upstream release or commit with those files copied into its checkout. You only need a fork if you change application code.

1. Put a configured `wrangler.jsonc`, your four policy Markdown files, and your square `static/logo.png` in your instance repository. Use resources from your own Cloudflare account.
2. Copy the applicable settings from `.dev.vars.example` to Worker variables and set every
   secret interactively with `pnpm exec wrangler secret put NAME`.
3. Verify the selected Cloudflare account with `pnpm exec wrangler whoami`, then apply migrations to **your** remote D1 database:

   ```bash
   pnpm exec wrangler d1 migrations apply YOUR_DATABASE_NAME --remote
   ```

4. Overlay the instance files onto the chosen upstream checkout, then build and deploy the Worker and attach a domain you control. Set `ORIGIN` and `INSTANCE_URL` to that HTTPS URL.
5. Before inviting users, test phone verification, photos, listings, messaging, password reset
   email, and administrator access.

For complete operator guidance, read the repository-hosted [self-hosting documentation](docs/self-hosting/README.md): [quickstart](docs/self-hosting/quickstart.md), [configuration](docs/self-hosting/configuration.md), [Cloudflare deployment](docs/self-hosting/deploy-cloudflare.md), [email](docs/self-hosting/email.md), and [operations](docs/self-hosting/operations.md).

## Tech stack

- [SvelteKit](https://kit.svelte.dev) — full-stack web framework
- [Cloudflare Workers](https://workers.cloudflare.com) — serverless runtime
- [Cloudflare D1](https://developers.cloudflare.com/d1/) + [Drizzle ORM](https://orm.drizzle.team) — database
- [Better Auth](https://www.better-auth.com) — authentication
- [Twilio](https://www.twilio.com) — phone verification
- Custom CSS design system — styling and theming

## Email delivery

Transactional email is selected by `EMAIL_PROVIDER` in `.dev.vars` locally and Worker secrets in production. Both providers use the same application interface.

- `resend`: set `RESEND_API_KEY` and `EMAIL_FROM`.
- `ses`: set `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`, `SES_REGION`, and `EMAIL_FROM`. `SES_SESSION_TOKEN` is optional for temporary AWS credentials.

For SES, verify the sending address or domain in the chosen SES region and give the IAM identity only the `ses:SendEmail` permission. New SES accounts remain in the SES sandbox until AWS grants production access; sandbox accounts can send only to verified recipients. Never put the AWS secret key in `wrangler.jsonc`; use `wrangler secret put` for each secret.

## License

[AGPL-3.0](LICENSE)
