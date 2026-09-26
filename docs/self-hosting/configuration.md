# Configuration

Copy `.dev.vars.example` to `.dev.vars` for local work. For production, store secrets with `wrangler secret put NAME`; never commit them to `wrangler.jsonc`. Self-hosters must also replace every D1, KV, and Images account identifier in `wrangler.jsonc` with resources from their own Cloudflare account; see [Deploy on Cloudflare](deploy-cloudflare.md).

## Core settings

| Variable             | Purpose                                                           | Where                   |
| -------------------- | ----------------------------------------------------------------- | ----------------------- |
| `ENVIRONMENT`        | `development` locally; deployment environment label in production | local / Worker variable |
| `ORIGIN`             | Public URL, such as `https://your-instance.example`               | local / secret          |
| `BETTER_AUTH_SECRET` | High-entropy secret for auth state                                | secret                  |
| `ADMIN_EMAILS`       | Comma-separated operator email addresses                          | secret                  |
| `INSTANCE_THEME`     | Optional visual theme                                             | Worker variable         |

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

An unknown or omitted value safely falls back to `default`. Visitor color mode is separate: people can choose system default, light, or dark mode with the control on the landing page; the selected instance theme remains the accent in every mode.

## Production integrations

| Area               | Variables                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Phone verification | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, `PHONE_PEPPER`          |
| Contact protection | `CONTACT_ENCRYPTION_KEY`                                                                        |
| Cloudflare Images  | `CF_IMAGES_API_TOKEN` with Images Write permission, plus account values in Worker configuration |
| Reputation checks  | Optional: `DBBL_ENABLED=true`, `DBBL_API_URL`, and `DBBL_API_KEY`                               |
| Web push           | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT`                                        |

Email is covered in [Email delivery](email.md).

## Optional: DBBL reputation network

DBBL is disabled by default. When disabled, the application does not send phone or email hashes to DBBL, does not query reputation scores, does not enforce stored DBBL ratings, and does not report bans.

To opt in, set both values:

```dotenv
DBBL_ENABLED=true
DBBL_API_URL=https://api.dbblprotocol.org
DBBL_API_KEY=...
```

Operators who enable it are responsible for deciding whether this cross-instance data sharing fits their community and privacy obligations.

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
