# Quickstart

This runs Jaydslist locally with Cloudflare's local D1 emulator. It is for development and evaluation, not production.

## 1. Install dependencies

```bash
pnpm install
```

The repository's CI uses Node.js 22 and pnpm 11. If pnpm is already installed, you do not need Corepack.

## 2. Create local configuration

```bash
cp .dev.vars.example .dev.vars
```

Set `ENVIRONMENT=development`, `ORIGIN=http://localhost:5173`, and a high-entropy `BETTER_AUTH_SECRET`. Set `CONTACT_ENCRYPTION_KEY` to a base64-encoded 32-byte key and `PHONE_PEPPER` to a separate random secret. For local phone verification, set a non-production `DEV_BYPASS_OTP`; the bypass only works with `ENVIRONMENT=development`. Never deploy it.

See [Configuration](configuration.md) for every integration and secret.

## 3. Create the local database

```bash
pnpm exec wrangler d1 migrations apply DB --local
```

## 4. Optionally load sample data

```bash
pnpm seed
```

`pnpm seed` wipes and recreates the local D1 data. Do not run it against a database you want to preserve.

## 5. Start the app

```bash
pnpm dev
```

Open <http://localhost:5173>. Restart it after changing `.dev.vars`.

## Verify the setup

Create a listing with one account, then use a second account to send the first message. If email is configured, the listing owner receives a notification. Password reset is also a quick email test.

```bash
pnpm test
pnpm test:integration
pnpm test:e2e
```

Local storage is separated by purpose:

| Purpose                                     | Server                        | Storage              |
| ------------------------------------------- | ----------------------------- | -------------------- |
| Normal development (`pnpm dev`)             | `http://localhost:5173`       | `.wrangler/state/v3` |
| Browser tests (`pnpm test:e2e`)             | `http://localhost:5174`       | `.wrangler/e2e/v3`   |
| Integration tests (`pnpm test:integration`) | Isolated Workers test runtime | Per-test D1/KV state |

Browser tests start their own server and seed only their dedicated database. You can leave your normal dev server running. Port 5174 must be free; tests fail instead of reusing another server. The browser-test configuration is `e2e/wrangler.jsonc`, with synthetic local settings and no email, SMS, DBBL, or Images credentials. Your normal `.dev.vars` is not used by that server.

Local photo uploads also stay in the local KV emulator. The dev-only screening selector lets you simulate Safe, NSFW, or Uncertain results without Cloudflare Images or AWS credentials. See [Photo screening and consent](photo-screening.md).

Normal local development data remains separate from deployed Cloudflare resources. `pnpm seed` still wipes **normal development D1 data**, so use it only when you want to reset that local database. No hosted development instance is required.

On WSL, install Chromium and its system dependencies for Playwright:

```bash
pnpm exec playwright install --with-deps chromium
```
