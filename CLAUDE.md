# Jaydslist — Claude Code Context

## Project Overview
Jaydslist is an AGPL open source personals platform focused on casual encounters.
Mobile-first PWA, privacy-focused, built on SvelteKit + Cloudflare.
Designed to be self-hostable — instance name and config driven by environment variables.
Target users are mobile browsers — all UI decisions prioritize mobile UX.

## Stack
- SvelteKit + Cloudflare Workers adapter
- D1 + Drizzle ORM (schema fully written and pushed)
- Better Auth (email/password scaffolded, phone verification to be built)
- Pico CSS for styling (Paper CSS was tried and abandoned — do not add it back)
- Cloudflare Images for photo storage (configured — account on Starter plan, $5/mo)
  - `CF_IMAGES_ACCOUNT_ID` and `CF_IMAGES_ACCOUNT_HASH` in wrangler.jsonc vars
  - `CF_IMAGES_API_TOKEN` in .dev.vars (token named `jaydslist-images`, Images Write permission)
  - Upload pattern: direct creator upload (server issues signed URL, client uploads directly to CF)
  - Delivery URL format: `https://imagedelivery.net/{CF_IMAGES_ACCOUNT_HASH}/{cfImageId}/public`
  - Utility: `src/lib/server/cloudflare-images.ts` (getDirectUploadUrl, deleteImage, imageUrl)
  - Upload URL API: `POST /api/photos/upload-url` → `{ uploadUrl, id, deliveryUrl }`
- Cloudflare Turnstile for spam prevention (not yet configured)

## Related Projects

### The DBBL Protocol
Cross-platform identity reputation API — think Spamhaus for bad actors on social/dating platforms.
Jaydslist is both a consumer and contributor. Separate Cloudflare account and GitHub org.

- Base URL: stored in wrangler.jsonc as `DBBL_API_URL` (https://api.dbblprotocol.org)
- API key: stored in `.dev.vars` as `DBBL_API_KEY`
- Auth header: `Authorization: Bearer <DBBL_API_KEY>`
- GitHub: github.com/the-dbbl-protocol/dbbl-api

#### Endpoints Jaydslist uses
- `GET /v1/scores?phoneHash=<hash>` — query risk score
- `POST /v1/reports` — submit a confirmed ban

#### Fields Jaydslist reads from a score response
```
rating: "clear" | "flagged" | "cautioned" | "restricted" | "blacklisted" | null
score: number | null   // 0-100
clean: boolean
```

#### Rating thresholds
| Rating | Action |
|---|---|
| clear / flagged / no_data | Allow normally |
| cautioned | Allow but flag account internally for closer monitoring |
| restricted / blacklisted | Deny access, show generic error |

#### Where Jaydslist queries DBBL
1. **Registration** — after phone verified and carrier validated. Cache result to `user_profiles.dbbl_risk_score`, `dbbl_risk_rating`, `dbbl_last_checked_at`.
2. **First message in a thread** — before delivering initiator's first message. Re-checks in case rating worsened since registration. Only runs once per thread.
3. **Confirmed ban** — fire-and-forget POST to `/v1/reports` after moderator confirms a ban. Do not block the ban action on DBBL response.

#### Violation category mapping (Jaydslist → DBBL)
| Jaydslist | DBBL |
|---|---|
| harassment | harassment |
| spam / mass messaging | spam |
| fake profile | fake_profile |
| unsolicited explicit content | explicit_content |
| unsolicited DM pattern | unsolicited_dm |

#### Hashing phone numbers for DBBL
Always normalize to E.164 before hashing — hash must be consistent across all platforms.
1. Strip all non-digit characters
2. If 10 digits → prepend `+1`
3. If 11 digits starting with `1` → prepend `+`
4. SHA256 hash the E.164 string using Web Crypto API (available in Workers):
```ts
const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized))
```

#### Error handling policy
DBBL being unavailable must NEVER block core Jaydslist functionality. Wrap all DBBL calls in try/catch. Fail open — if DBBL is down, allow the action and log the error. The one exception: if DBBL returns a confirmed restricted/blacklisted and the call succeeded, block registration.

## What's Been Built
- Full Drizzle schema pushed to D1 (src/lib/server/db/schema.ts)
- Better Auth scaffolded with email/password (login, register routes live)
- Phone verification flow partially built (verify-phone route, Twilio client, KV-backed OTP)
- Pico CSS layout with bottom mobile nav, drawer, desktop nav (src/routes/(app)/+layout.svelte)
- Wrangler configured with D1 binding (DB), KV binding (PHONE_VERIFICATION_KV), and DBBL_API_URL env var
- Browse page with preference gate, listing feed, card/list view toggle, radius + nature filters
- Listing creation — 5-step flow with relative terms scanner (src/routes/(app)/post/)
- Listing detail — full view with respond flow (src/routes/(app)/listings/[id]/)
- Listing edit — with age range dual slider, flagged listing notice (src/routes/(app)/listings/[id]/edit/)
- My listings page with bump, status badges, flagged reactivation flow
- Inbox — thread list and single thread view with key exchange, message photos
- Message photos (all users) — camera button in compose, 140px thumbnail, tap-to-lightbox
- Cloudflare Images pipeline — direct upload, delivery URL construction, lightbox viewer
- Admin panel — report queue with dismiss/warn/suspend/ban actions, user lookup (src/routes/(app)/admin/)
- Report flow — from listing detail (listing reports) and thread page (user reports)
- Email notifications via Resend — listing suspension, user warning (src/lib/server/email.ts)
- Trust tier lazy promotion — new→established (14 days), established→trusted (60 days + response rate)
- Response rate tracking — totalThreads increments on new thread, respondedThreads on poster's first reply
- Favicon (static/favicon.svg)
- Real-time-ish messaging — thread polling via `invalidate('app:thread')` every 3s (paused when tab hidden), email notification on new message (15-min cooldown per thread via `lastNotifiedAt`), VAPID web push (service worker + `POST /api/push/subscribe`)
- Abuse detection — per-thread flood detection (>10 msgs/10min auto-suspends sender + alerts admins), daily thread velocity check against trust tier limits (3x cap triggers auto-suspend)
- Vault-backed listing photo picker (src/lib/components/listings/ListingPhotoPicker.svelte) — supporter-only, pick from vault or upload fresh during listing creation
- Photo vault management page (src/routes/(app)/vault/) — supporter-only: view/upload/delete vault photos, organize into albums, soft-delete + conditional hard-purge lifecycle, "purged while paused" warning banner on listing resume

### Schema additions beyond initial push
- `photo_albums` table (id, userId, name, createdAt)
- `album_id` column on `photo_vault` (nullable FK to photo_albums)
- `cf_image_id` column on `messages` (nullable, for message photos)
- `body` column on `messages` now has default '' (allows photo-only messages)

## What's Next
- Supporter tier "advanced features" list — being designed (see below), not yet implemented
- pHash blocklist enforcement (Phase 3, deferred)
- DBBL integration — reputation checks at registration and first message
- Relative terms scanner — real-time flagging in listing body
- Stripe / supporter tier — monetization
- Self-hosting docs

## Route Structure (to be built)
src/routes/
+layout.svelte              — global nav, bottom mobile nav, footer
+page.svelte                — redirects to /browse
browse/
+page.svelte              — listing feed with preference gate
+page.server.ts           — load listings with filters
listings/
[id]/
+page.svelte            — single listing detail
+page.server.ts         — load single listing
post/
+page.svelte              — multi-step listing creation
+page.server.ts           — form actions
inbox/
+page.svelte              — conversation thread list
+page.server.ts
[threadId]/
+page.svelte            — single thread view
+page.server.ts
profile/
+page.svelte              — account settings, contact methods
+page.server.ts
login/
+page.svelte
+page.server.ts
register/
+page.svelte
+page.server.ts
verify-phone/
+page.svelte            — phone verification step (OTP via Twilio)
+page.server.ts
admin/
+layout.svelte            — admin-only guard
+page.svelte              — moderation queue

## Component Structure (to be built)
src/lib/components/
listings/
ListingCard.svelte
ListingFeed.svelte
ListingDetail.svelte
browse/
PreferenceGate.svelte
FilterPanel.svelte
RadiusSlider.svelte
post/
PostStep1.svelte          — who you're looking for
PostStep2.svelte          — nature of connection + mood
PostStep3.svelte          — write listing, relative terms scanner
PostStep4.svelte          — requirements
PostStep5.svelte          — review and post
inbox/
ThreadList.svelte
ThreadView.svelte
MessageInput.svelte
profile/
ContactMethods.svelte
KeyExchange.svelte
shared/
TrustBadge.svelte
FuzzyLocation.svelte
DistanceLabel.svelte

## Build Order
1. Auth flow — registration, phone verification, DBBL check, login
2. User profile completion — identity, physical type, contact methods
3. Browse page — preference gate, listing feed
4. Listing creation — multi-step flow with relative terms scanner
5. Listing detail — single listing view with respond flow
6. Inbox — conversation threads and messaging
7. Key exchange — contact unlock system
8. Admin — moderation queue

---

## Key Design Decisions

### Authentication
- Phone verified accounts only — no social logins, no anonymous posting
- Phone number normalized to E.164 format, SHA256 hashed before storage
- VoIP/virtual number detection via Twilio Lookup or Telesign at registration
- On registration, query DBBL with phone hash — block if rating is restricted or blacklisted
- One lifetime warning system — users get one warning ever for policy violations, subsequent violations result in immediate action
- Better Auth handles core session management

### Identity Model (two-layer)
Users have two separate profile fields — kept separate by design:
- **Identity** — how they identify: man, woman, non_binary, transgender_man, transgender_woman, other
- **Physical type** — their physical reality: male, female, other
These are separate because a poster's requirements and a searcher's filters may reference either or both independently.
Hard requirements can be set on identity, physical type, or both.

### Location and Geo
- Radius-based search only — no city-based browsing
- Browser Geolocation API used to get user coordinates
- Coordinates stored server-side only — NEVER exposed to client
- Fuzzy location label generated at post time (e.g. "NE Phoenix area") — this is all that's shown publicly
- Distance shown as a label only (e.g. "About 8 miles away") rounded to nearest mile
- No map view — privacy concern for a personals platform
- Radius slider on browse page: 5 / 10 / 25 / 50 / 100 miles options

### Browse Page
- Users must set preferences before seeing any listings (preference gate)
- Preference gate collects: who you are, who you're looking for, physical preference (optional), nature of connection, location, radius
- Preferences saved to account if logged in, localStorage if guest
- Guest browsing allowed with limitations:
  - Guests can browse and read listings
  - Guests cannot respond to listings
  - Guests cannot see distance (fuzzy region only)
- Default sort: by last_bumped_at descending (bump-aware feed)
- Filters always visible: seeking preference, radius slider
- Additional filters behind a filter panel: nature of connection, mood, availability

### Listing Cards
Each card shows:
- Category tag
- Trust tier indicator
- Subject line (free text, poster-written)
- Structured metadata: identity · age · looking for · nature of connection · mood
- Fuzzy location + distance label
- Time posted

### Listing Creation (multi-step flow)
Step 1 — Who you're looking for (identity, physical, age range)
Step 2 — Nature of connection, mood/vibe, availability
Step 3 — Subject line + body (relative terms scanner runs here)
Step 4 — Hard and soft requirements
Step 5 — Review and post

Subject line is free text — the poster's hook. Structured metadata is auto-generated from their selections and shown separately on the card — NOT part of the subject.

Listings expire after 14 days. Grace period of 7 days after expiry where listing is invisible but renewable. After grace period listing is archived — conversation threads retain a snapshot of the listing content even after archival.

**NOT YET IMPLEMENTED:** the expire/grace/archive lifecycle above is aspirational only. `listings.status` is a plain unconstrained text column; the only values ever actually set anywhere in code today are `active`, `paused`, `removed`, `flagged`. There is no `archived`/`expired` status and no cron/scheduled Worker that transitions a listing based on `expiresAt`. This matters for the supporter "total listings" cap design below — it currently has no automatic release valve, only manual delete (`removed`).

### Relative Terms System
As poster writes their body text, the platform scans for flagged relative terms in real time.
Flagged terms are highlighted inline (like a grammar checker).
The post button is locked until all flagged terms have poster-defined definitions.
Definitions appear as a structured glossary block at the bottom of the published listing.
The framing is helpful, not punitive — "help potential matches understand what you mean by this."

Relative terms vocabulary includes (not exhaustive):
Physical: cute, pretty, attractive, hot, fit, athletic, slim, thick, large, small, tall, short, average
Distance: nearby, close, local, far
Age: young, older, mature, younger
Personality: serious, casual, laid back, intense, outgoing
Timing: soon, later, regular, occasional, often

### Bump System
- One bump per day maximum per listing
- Bump resets the last_bumped_at timestamp which is what the feed sorts by
- No new listing created — same URL, same conversation threads
- Bump cooldown enforced server-side (24 hours)
- Bumping near expiry prompts renewal option
- All bump events logged to listing_events table

### Categories
- casual_encounters is the only category at launch
- Category system is configuration-driven — instance operators can enable/disable categories
- Additional categories to be added later

### Listing Seeking Options
**Nature of connection** (multi-select):
- dating — Dating / Getting to know someone
- fwb — Friends with Benefits
- one_time — One time / No strings attached
- platonic — Strictly Platonic
- open — Open to anything

**Mood/vibe** (single select):
- coffee_first — Coffee first / Let's chat
- dinner_date — Dinner / proper date
- netflix_chill — Netflix & Chill
- ready_now — Ready now
- just_browsing — Just browsing / no rush

**Availability** (single select):
- available_now
- available_today
- available_weekend
- flexible

### Listing Requirements
**Hard requirements** — enforced by platform before thread can open:
- Age range (min/max) — verified against profile
- Distance radius — verified against stored location
- Trust tier minimum — new / established / trusted
- Verified account only
- Identity preference
- Physical type preference

**Soft requirements** — poster-defined, shown to responder before first message:
- Free text prompts the responder must acknowledge with a checkbox
- Conscious acknowledgment creates accountability even though not technically enforced
- Pattern of ignoring soft requirements factors into trust score over time

### Messaging
- Post-based only — threads tied to a specific listing, no free DMs
- Responding to a listing opens a thread — neither party sees the other's contact info
- Poster controls the thread — can close at any time
- One thread per initiator per listing (enforced by unique constraint)

**Message quality enforcement:**
- Minimum character count before send button activates (configurable, default 100 chars)
- Keyword/phrase blacklist blocks obvious low-effort openers (hey, hi, still looking, interested, etc.)
- Copy-paste detection via similarity scoring against sender's recent messages
- AI classification layer for quality and genuine engagement scoring
- One lifetime warning ever for low quality messages — subsequent attempts blocked immediately with reputation impact
- Genuinely disrespectful/explicit openers get zero warnings — immediate block and reputation hit
- Posters never see blocked messages — their inbox only contains messages that passed quality checks

**Thread velocity limits by trust tier (configurable):**
- new: 3 new threads per day
- established: 10 new threads per day
- trusted: 25 new threads per day

**Response accountability:**
- Response rate displayed on user profile
- Poster nudged after 48 hours of no response to an open thread
- Decline button as first-class feature — one tap sends polite canned decline
- Consistent non-response affects trust tier over time

### Key Exchange (Contact Unlock)
Mutual consent system for sharing verified contact info off-platform.

**What's shared:** verified phone + email from the user's account only. No social handles or custom contact methods.

**Eligibility to offer:**
- Poster: after receiving the first message in the thread
- Responder: after sending their first message AND receiving at least one reply from the poster

**Flow:**
- Either eligible party taps "Share contact info" in the thread
- Other party sees a prompt to accept or decline
- On acceptance: both parties' verified phone + email are revealed simultaneously
- On decline: offer dismissed, thread continues normally, either party can re-initiate later
- Offerer can revoke at any time (before or after acceptance)
- Revocation hides info for both parties — requires full offer/accept flow again to re-reveal

**Exchange logging:** `key_exchanges` table records all offers/accepts/declines/revocations per thread. Revealed values are not stored post-exchange.

### Photo Vault
Photos are a **paid-tier feature only**. Free users post text-only listings.

**Vault:** paid users upload photos to a personal vault (max `VAULT_MAX_PHOTOS_PAID`, default 10). Photos are stored via Cloudflare Images, which handles resizing and CDN delivery. The vault is account-level — not per-listing.

**Per listing:** up to `LISTING_MAX_PHOTOS` (default 3) photos chosen from the vault. The same vault photo can appear on multiple active listings simultaneously.

**Soft delete:** when a user removes a photo from their vault, it's soft-deleted (`deletedAt` set). It remains in Cloudflare Images and stays visible on any active listing that references it. It's only hard-purged (deleted from CF Images) when no active listing references it — tracked via `listingPhotos.purgedAt`.

**Unpaused listing with purged photo:** if a listing is unpaused and one of its photos was purged while it was inactive, show a warning to the lister that the photo is gone.

**pHash blocklist:** photos are checked against a D1 blocklist (`photo_blocklist`) at upload using dHash (difference hash). Hamming distance threshold is `PHASH_HAMMING_THRESHOLD` (default 10 bits). On a confirmed ban, the banned user's photo hashes are added to the blocklist automatically (fire-and-forget). The blocklist starts empty and grows from bans and manual additions.

**Albums:** vault photos can be organized into named albums (`photo_albums` table). `photo_vault.albumId` is nullable — unorganized photos appear in an "Uncategorized" bucket.

**Message photos:** all users (not just supporters) can send a photo in a thread. Stored as `messages.cfImageId`. Separate from the vault — no vault involvement for message photos.

**Schema tables:** `photo_albums`, `photo_vault`, `listing_photos` (junction), `photo_blocklist`

### Trust and Reputation
**Trust tiers:** new → established → trusted
- new: account under 14 days old
- established: 14+ days, no violations, reasonable activity
- trusted: 60+ days, clean history, good response rate

**Reporter trust score (hidden, 0-1):**
- Reports that lead to confirmed bans increase score
- Dismissed reports decrease score
- Score decays slightly over time without active reporting
- Higher score = reports carry more weight in moderation queue

**DBBL integration:**
- Query DBBL at registration with phone hash
- Query DBBL before first message in a thread
- Submit confirmed bans to DBBL automatically
- DBBL risk score cached on user_profiles.dbbl_risk_score
- Block accounts with rating restricted or blacklisted

### Admin / Moderation
Phase 1 (launch) — minimal viable:
- Simple report queue with approve/dismiss
- Manual account ban capability
- Basic user lookup
- Email notification when reports cross threshold

All moderation actions logged to moderation_actions table with actor, target, reason, and source report.
Reporter trust scores calculated from report outcomes stored in reports table.

### Platform Configuration
All tunable values live in platform_config table and DEFAULT_CONFIG constant.
Never hardcode these values in business logic — always read from config.
Key config values:
- LISTING_DURATION_DAYS: 14
- LISTING_GRACE_PERIOD_DAYS: 7
- LISTING_BUMP_COOLDOWN_HOURS: 24
- MESSAGE_MIN_LENGTH: 100
- MESSAGE_SIMILARITY_THRESHOLD: 0.8
- TRUST_TIER_ESTABLISHED_DAYS: 14
- TRUST_TIER_TRUSTED_DAYS: 60
- DBBL_CHECK_ENABLED: true
- DBBL_BLOCK_RATING: restricted
- RESPONSE_RATE_NUDGE_HOURS: 48
- THREAD_VELOCITY_NEW_PER_DAY: 3
- THREAD_VELOCITY_ESTABLISHED_PER_DAY: 10
- THREAD_VELOCITY_TRUSTED_PER_DAY: 25
- INSTANCE_NAME: Jaydslist
- INSTANCE_TAGLINE: Real connections, real people
- INSTANCE_URL: https://jaydslist.com

### Monetization Model
No ads. No paywalled core features. Fully functional free tier.

**Free tier** — everything works:
- All browsing, filtering, messaging, key exchange
- 1 active listing at a time
- 24-hour bump cooldown
- 14-day listing duration
- Trust tier system applies normally

**Supporter tier** — pay what you want, minimum ~$4/mo or $30/yr (via Stripe):
- Supporter badge on profile (opt-in)
- Up to 3 simultaneous active listings
- Bump cooldown reduced to 12 hours
- Listing duration extended to 21 days
- Listed on `/supporters` page (opt-in)
- All core features identical to free — no functional degradation for free users

**Gifted supporter** — same perks, sent to another user:
- "Gift a month" button available on user profiles and after a key exchange
- Recipient gets a quiet, non-intrusive notification (anonymous or named, their choice)
- Gifter optionally shown a subtle "generous" indicator on their profile
- Natural post-connection gesture — no forced prompting

**Donation touchpoints (non-naggy):**
- One-time quiet prompt after a successful key exchange: "Glad it worked out. Jaydslist runs on donations."
- `/supporters` page listing contributors
- No modals, no banners, no repeated asks

Payment processor: Stripe (required for subscriptions + gifting mechanics).
Config values to add: SUPPORTER_MIN_MONTHLY, SUPPORTER_MIN_ANNUAL, SUPPORTER_MAX_LISTINGS, SUPPORTER_BUMP_COOLDOWN_HOURS, SUPPORTER_LISTING_DURATION_DAYS.

#### Supporter "advanced features" — design in progress, NOT YET IMPLEMENTED
Being locked down before any code is written. Decisions so far:

**Messaging perks (confirmed):** typing indicators, read receipts, message edit/unsend (2-minute window), higher thread velocity limit as a flat bonus on top of the trust-tier number (not a multiplier, not a floor).

**Listing perks (confirmed):** listing view analytics; bigger photo vault — 3 albums max, 5 photos max per album, 15 total vault photos. "Uncategorized" is not a separate bucket with its own cap — albums are just organizational pointers onto the same 15-photo pool.

**Explicitly rejected:** browse sort/ranking boost for supporters (flagged as pay-to-win risk against the platform's anti-Doublelist ethos).

**Config mechanism (decided):** hybrid — env vars in wrangler.jsonc (matching the existing `CF_IMAGES_*`/`DBBL_*` pattern) set deploy-time defaults; the existing-but-currently-unused `platform_config` DB table plus a new admin panel page allow live overrides after deploy. Precedence: `platform_config` DB row (if set) > matching env var (if set) > hardcoded `DEFAULT_CONFIG` fallback. Env var names match `DEFAULT_CONFIG` keys exactly so a generic `getConfig()` helper works without a per-key switch statement.

**Listing count tiers (in negotiation, not fully locked):** active (concurrently live) listings scale by trust tier — free: new=1, established=2, trusted=3; supporter = trust-tier base + 2 (new=3, established=4, trusted=5). Separate flat "total" lifetime-style cap regardless of trust tier: 10 for free, 20 for supporter (user's own words: "i think this is excessive but it needs a cap"). "Total is total" — counts every existing listing row regardless of active/paused status; only archiving or manual deletion frees up room. **Open problem:** since archiving doesn't actually exist yet (see NOT YET IMPLEMENTED note under Listing Creation above), this cap currently has no working release valve besides delete — needs resolution before implementation.

**Still unconfirmed:** the actual flat-bonus number for supporter thread velocity (got derailed into the listing-count discussion before a number was picked).

### Open Source / Self-Hosting
- AGPL licensed
- Instance name, tagline, and URL are all config-driven per deployment
- Category visibility is config-driven per deployment
- Operators set their own DBBL_API_KEY and DBBL_API_URL
- Operators who fork and run their own instance are encouraged but not required to contribute changes back