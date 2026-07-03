# Jaydslist

A privacy-focused personals platform built for real connections. No algorithms, no ads, no dark patterns — just people.

## What it is

Jaydslist is a modern classifieds-style personals platform focused on casual encounters and genuine connection. It is phone-verified, mobile-first, and designed entirely around the user experience rather than engagement metrics or monetization.

## Core values

**Privacy first.** Your location is never exposed — listings show only a fuzzy region label. Contact information stays inside the platform until both parties explicitly consent to share it via the key exchange system. Phone numbers are stored as one-way hashes.

**Real people only.** Every account requires phone verification. VoIP and virtual numbers are rejected at registration. Accounts are cross-referenced against the DBBL Protocol, an open reputation network for identifying bad actors across platforms.

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
- [Pico CSS](https://picocss.com) — styling
- [DBBL Protocol](https://github.com/the-dbbl-protocol/dbbl-api) — cross-platform reputation network

## License

[AGPL-3.0](LICENSE)
