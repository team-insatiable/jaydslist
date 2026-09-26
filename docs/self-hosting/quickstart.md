# Quickstart

This runs Jaydslist locally with Cloudflare's local D1 emulator. It is for development and evaluation, not production.

## 1. Install dependencies

```bash
pnpm install
```

If pnpm is already installed, you do not need Corepack. On Linux, install Bubblewrap if Codex reports it missing; it is a development-environment sandbox prerequisite, not an application dependency.

## 2. Create local configuration

```bash
cp .dev.vars.example .dev.vars
```

Set a high-entropy `BETTER_AUTH_SECRET`. For local phone verification, set a non-production `DEV_BYPASS_OTP`. Never deploy that bypass.

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

On WSL, install Chromium and its system dependencies for Playwright:

```bash
pnpm exec playwright install --with-deps chromium
```
