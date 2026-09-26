<svelte:head>

<title>Self-hosting documentation · Jaydslist</title>
<meta name="description" content="Documentation for running an independent Jaydslist instance." />
</svelte:head>

# Self-hosting Jaydslist

Jaydslist is an AGPL-licensed, Cloudflare-native personals platform. These guides cover local setup and the production services supported by this repository.

## Start here

1. Follow the [quickstart](/docs/quickstart) to run the app locally with D1 and sample data.
2. Use the [Cloudflare deployment guide](/docs/deploy-cloudflare) to provision your own infrastructure.
3. Read the [configuration reference](/docs/configuration) before connecting production services.
4. Configure [email delivery](/docs/email) before inviting real users.

## Production hoster checklist

You need all of these before a public launch:

| Requirement                       | Why it is needed                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Node.js and pnpm                  | Build, migrate, and deploy the application.                                                                              |
| Cloudflare account                | Hosts the Worker and provides a D1 database, KV namespace, and Cloudflare Images account.                                |
| Domain under your control         | Serves the public app and authenticates email. Point it at your Worker after deployment.                                 |
| Twilio account and Verify service | Phone verification is required for real accounts.                                                                        |
| DBBL API key                      | Optional. Only needed if the operator explicitly enables cross-instance reputation lookups and reporting.                |
| Amazon SES or Resend account      | Sends password resets, inbox notices, and moderation email.                                                              |
| Operator email address            | Receives abuse alerts and is configured in `ADMIN_EMAILS`.                                                               |
| Moderation and legal process      | You are responsible for your instance's rules, privacy notice, abuse handling, data retention, and local-law compliance. |

Cloudflare Images must be enabled and its API token needs **Images Write** permission because user photos are uploaded through the Images API. [Cloudflare Images direct uploads](https://developers.cloudflare.com/images/storage/upload-images/direct-creator-upload/)

Keep secrets out of git. Use `.dev.vars` locally and Worker secrets in production.

## Deployment support

Cloudflare Workers is the supported production target. The repository includes Worker configuration, D1 migrations, and the application build. Other hosting targets are not yet documented or tested as supported deployments.
