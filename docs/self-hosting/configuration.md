# Configuration

Copy `.dev.vars.example` to `.dev.vars` for local work. For production, store secrets with `wrangler secret put NAME`; never commit them to `wrangler.jsonc`. Self-hosters must also replace every D1, KV, and Images account identifier in `wrangler.jsonc` with resources from their own Cloudflare account; see [Deploy on Cloudflare](deploy-cloudflare.md).

## Core settings

| Variable                  | Purpose                                                           | Where                   |
| ------------------------- | ----------------------------------------------------------------- | ----------------------- |
| `ENVIRONMENT`             | `development` locally; deployment environment label in production | local / Worker variable |
| `ORIGIN`                  | Public URL, such as `https://your-instance.example`               | local / secret          |
| `BETTER_AUTH_SECRET`      | High-entropy secret for auth state                                | secret                  |
| `ADMIN_EMAILS`            | Comma-separated operator email addresses                          | secret                  |
| `INSTANCE_THEME`          | Optional visual theme                                             | Worker variable         |
| `INSTANCE_PRELAUNCH_MODE` | Set to `true` for a public beta waitlist landing page             | Worker variable         |

## Public identity and policies

Set `INSTANCE_NAME`, `INSTANCE_TAGLINE`, `INSTANCE_URL`, `INSTANCE_LEGAL_EMAIL`, and `INSTANCE_SOURCE_URL` in your instance configuration. `INSTANCE_URL` is the public HTTPS URL used in policy links; it does not replace `ORIGIN`, which configures authentication. Keep the source URL pointing at the GitHub repository whose `main` branch contains the operator guide.

For example, in your private `wrangler.jsonc` under `vars`:

```jsonc
"INSTANCE_NAME": "Your Community",
"INSTANCE_TAGLINE": "Local connections, your way",
"INSTANCE_URL": "https://your-instance.example"
```

Redeploy after changing these values. The name is used throughout the app, account pages, public-page footers, and transactional email text. The tagline appears in the app header and landing page metadata. Set `EMAIL_FROM` separately to your chosen sender name and verified email address; `INSTANCE_NAME` does not override an explicitly configured sender. The bundled logo artwork still belongs to the upstream visual identity; changing the name does not replace that artwork. Policy files should use `{{INSTANCE_NAME}}` rather than hardcoding a name.

Overlay your own `content/about.md`, `content/rules.md`, `content/privacy.md`, and `content/terms.md` onto `src/lib/instance-content/` before building. These are public files, not secrets. The placeholders in the upstream checkout are not ready-to-use policies. See [instance policy content](deploy-cloudflare.md#instance-policy-content).

## Pre-launch beta waitlist

Set `INSTANCE_PRELAUNCH_MODE=true` to present a public landing page instead of the application. Signup stores a pending record; visitors join the confirmed waitlist only after following the expiring email link. Signed-in administrators retain application access. About, Rules, Privacy, Terms, and Self-host remain public. This feature does not send a beta launch announcement or provide campaign management.

This feature adds a D1 migration. Apply that migration before enabling the setting, and ensure your transactional email provider is configured.

## Instance theme

`INSTANCE_THEME` selects the instance-wide accent color. It changes buttons, links, focus states, and other primary UI accents; it does not replace the instance name or logo.

| Value     | Accent           |
| --------- | ---------------- |
| `default` | Blue (`#2563eb`) |
| `rouge`   | Red              |
| `violet`  | Purple           |
| `jade`    | Green            |
| `amber`   | Orange           |
| `rose`    | Pink-red         |
| `teal`    | Cyan-teal        |
| `slate`   | Blue-gray        |

For example:

```dotenv
INSTANCE_THEME=jade
```

An unknown or omitted value safely falls back to `default`. Visitor color mode is separate: the landing page has a two-state light/dark toggle. It follows the system initially; the first click selects the opposite mode, and the next clears that override. The override is stored in browser local storage; the instance theme remains the accent in either mode.

## Production integrations

| Area               | Variables                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Phone verification | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, `PHONE_PEPPER`          |
| Contact protection | `CONTACT_ENCRYPTION_KEY`                                                                        |
| Cloudflare Images  | `CF_IMAGES_API_TOKEN` with Images Write permission, plus account values in Worker configuration |
| Web push           | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT`                                        |

Email is covered in [Email delivery](email.md).

## Advanced, opt-in integration: DBBL

DBBL is disabled by default. When disabled, the application does not send phone or email hashes to DBBL, does not query reputation scores, does not enforce stored DBBL ratings, and does not report bans.

DBBL is not needed for a standard deployment and is not an identity or age verification service. The code still supports this opt-in integration. To enable it, configure all three values:

```dotenv
DBBL_ENABLED=true
DBBL_API_URL=https://api.dbblprotocol.org
DBBL_API_KEY=...
```

Enabled lookups send unpeppered phone and email hashes to the configured API during phone verification and before opening a new conversation. These are linkable identifiers, not anonymous data. Restricted/blacklisted results can block access. Lookup failures generally fail open, although an already-stored restricted rating can still block a new conversation. Administrative bans may send reports.

Operators who enable it must decide whether these practices fit their community and publish accurate disclosures before enabling it.

## Current limitations to disclose

- Phone verification is not proof of identity or age. Registration starts with email and password; application access requires a verified number.
- Phone storage includes a peppered hash and an encrypted phone number, plus a short-lived pending verification number in KV.
- First-message checks enforce minimum length, new-conversation limits, and restrictions on contact details. There is no general automated spam/content-review engine.
- Free accounts can store five photos total and create one album. Supporters can store ten photos total across up to three albums. Listing and message photos use the same vault allowance; reusing a photo does not consume another slot. Privacy mode and higher listing limits remain supporter features. Billing and subscription checkout are not implemented.
- Photo allowances can be overridden with `VAULT_MAX_PHOTOS_FREE`, `VAULT_MAX_PHOTOS_PAID`, `VAULT_MAX_ALBUMS_FREE`, and `VAULT_MAX_ALBUMS_PAID`, using the usual database > environment > default precedence. The photo limit spans every album and uncategorized photos. Deleted photos retained by listings continue to count until physically purged. Existing albums and photos above a lowered limit remain accessible; new creation is blocked until usage falls below the limit.
- Uploads pass through the Worker so failed or abandoned browser confirmation cannot create uncounted images. A reserved upload occupies a slot until storage cleanup succeeds. If the Worker is interrupted or both upload and cleanup fail, an operator may need to reconcile the `photo_vault` row with `scan_status = 'uploading'` and the matching Cloudflare image before releasing the slot.
- There is no self-service account deletion, automatic retention purge, or waitlist campaign-management interface. Establish operator procedures instead of promising these as built-in features.

## Local-only setting

`DEV_BYPASS_OTP` skips real phone verification during local development. Remove it from production secrets and never share the code publicly.

## Adding production secrets

Run each command interactively so the secret does not appear in shell history:

```bash
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put CONTACT_ENCRYPTION_KEY
pnpm exec wrangler secret put TWILIO_AUTH_TOKEN
```

Apply D1 migrations before sending production traffic to code that depends on a new schema.
