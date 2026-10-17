# Operations and upgrades

An instance operator is responsible for its users, data, secrets, uptime, moderation process, and legal obligations. Establish these practices before public launch.

## Before each release

1. Review the upstream release or commit and its migration files.
2. Test the revision against a non-production database and configuration.
3. Confirm that instance secrets and account-bound resource IDs remain outside the upstream repository.
4. Run the relevant checks and back up the target database as appropriate.
5. Apply required D1 migrations after confirming the target database, before deploying code that depends on the new schema. Then deploy the application revision.
6. Verify registration, phone verification, listings, photos, messaging, email, and administrator access after deployment.

## Data and recovery

Maintain backups appropriate to your Cloudflare plan and retention obligations. Periodically test a restore procedure against a non-production environment. Keep a record of which Worker revision and migrations are running so an incident can be investigated or rolled back deliberately.

## Access and secrets

Use least-privilege Cloudflare and provider credentials. Keep local secrets in `.dev.vars` (which is ignored by git) and production secrets in the Worker secret store. Rotate credentials after suspected exposure and remove access promptly when an administrator no longer needs it.

## Community operations

Publish accurate rules, privacy information, a contact address, and a moderation process for your instance. Review reports, account actions, and abuse escalation paths regularly. Do not copy claims about billing, automatic screening, deletion, or third-party integrations unless they reflect your deployed code and enabled services. See the advanced opt-in integration section in [Configuration](configuration.md) if you intentionally use cross-instance reputation checks.

The [safety rule revision guide](safety-rules.md) describes the operator rule editor and its current limits. An active rule revision alone does not enable screening or delivery holds.
