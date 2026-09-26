# Jaydslist agent guide

## Repository role

This repository is the open-source Jaydslist upstream. Keep it deployable by any operator:

- Never commit instance-specific Cloudflare account IDs, database/KV IDs, domains, API tokens, email addresses, or other production values.
- Keep `wrangler.jsonc` generic, with placeholders for account-bound resources.
- Keep secrets in `.dev.vars` locally and Worker secrets in an operator's own Cloudflare account. Never print, commit, or copy their values into documentation.

The production instance uses a separate private configuration repository. Application changes belong here first; the instance repository only overlays its own Worker configuration and deploys a selected upstream revision.

## Working practices

- Start by checking `git status`; this checkout may contain intentional WIP. Do not discard or reset unrelated changes.
- Prefer focused commits and run the relevant checks before committing.
- Regenerate Worker types with `pnpm gen` when Worker bindings change.
- Do not apply D1 migrations, alter production data, or change Cloudflare resources without explicit operator authorization.
- Before any Cloudflare mutation, verify the authenticated account with `pnpm exec wrangler whoami`.

## Product direction

Jaydslist is intended to be privacy-first, ad-free, and open source. Core use must not be hidden behind a paywall. The current supporter/free-tier design, especially the photo-vault gate, is under review; do not expand paid gating without an explicit product decision.

## Current handoff

For local session-specific state, see `.agent-notes/HANDOFF.md`. That file is intentionally git-ignored and must not contain secrets.
