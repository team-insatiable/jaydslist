# Jaydslist

A privacy-focused personals platform built for real connections. No algorithms, no ads, no dark patterns — just people.

## What it is

Jaydslist is a modern classifieds-style personals platform focused on casual encounters and genuine connection. It is phone-verified, mobile-first, and designed entirely around the user experience rather than engagement metrics or monetization.

## Core values

**Privacy first.** Your location is never exposed — listings show only a fuzzy region label. Contact information stays inside the platform until both parties explicitly consent to share it through contact exchange. Phone numbers are stored as one-way hashes.

**Real people only.** Every account requires phone verification. VoIP and virtual numbers are rejected at registration. Operators may opt into the DBBL Protocol, an open cross-platform reputation network, if it fits their community and privacy obligations.

**Quality over volume.** Messages are held to a minimum quality standard before delivery. Copy-paste openers, low-effort one-liners, and disrespectful content are blocked before the recipient ever sees them. Posters only see messages that passed.

**Ad-free by design.** There are no ads, no promoted listings, no algorithmic feed manipulation. The platform is supported entirely by voluntary donations and an optional supporter tier. Free users have access to every core feature — paying is a way to support the project, not a requirement to use it.

**Built for users, not profit.** Every design decision prioritizes the person using the platform. There are no dark patterns, no engagement traps, no manufactured urgency. The goal is for people to connect and leave — not to maximize time on site.

**Open source.** Jaydslist is AGPL licensed. The code is public, the data model is transparent, and operators can run their own instances.

## Tech stack

- [SvelteKit](https://kit.svelte.dev) — full-stack web framework
- [Cloudflare Workers](https://workers.cloudflare.com) — serverless runtime
- [Cloudflare D1](https://developers.cloudflare.com/d1/) + [Drizzle ORM](https://orm.drizzle.team) — database
- [Better Auth](https://www.better-auth.com) — authentication
- [Twilio](https://www.twilio.com) — phone verification
- Custom CSS design system — styling and theming
- [DBBL Protocol](https://github.com/the-dbbl-protocol/dbbl-api) — optional cross-platform reputation network

## Email delivery

Transactional email is selected by `EMAIL_PROVIDER` in `.dev.vars` locally and Worker secrets in production. Both providers use the same application interface.

- `resend`: set `RESEND_API_KEY` and `EMAIL_FROM`.
- `ses`: set `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`, `SES_REGION`, and `EMAIL_FROM`. `SES_SESSION_TOKEN` is optional for temporary AWS credentials.

For SES, verify the sending address or domain in the chosen SES region and give the IAM identity only the `ses:SendEmail` permission. New SES accounts remain in the SES sandbox until AWS grants production access; sandbox accounts can send only to verified recipients. Never put the AWS secret key in `wrangler.jsonc`; use `wrangler secret put` for each secret.

## License

[AGPL-3.0](LICENSE)
