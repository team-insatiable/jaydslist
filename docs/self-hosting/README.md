# Self-hosting Jaydslist

These are the canonical operator guides for running an independent Jaydslist instance. They
live in the repository so they are available before an instance exists. The supported production
target is Cloudflare Workers.

## Start here

1. Follow the [quickstart](quickstart.md) to run the app locally with D1 and sample data.
2. Use the [Cloudflare deployment guide](deploy-cloudflare.md) to provision your own
   infrastructure.
3. Read the [configuration reference](configuration.md) before connecting production services.
4. Configure [email delivery](email.md) before inviting real users.
5. Establish the processes in [operations and upgrades](operations.md) before public launch.

## Production hoster checklist

You need all of these before a public launch:

| Requirement                       | Why it is needed                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Node.js and pnpm                  | Build, migrate, and deploy the application.                                                                              |
| Cloudflare account                | Hosts the Worker and provides a D1 database, KV namespace, and Cloudflare Images account.                                |
| Domain under your control         | Serves the public app and authenticates email. Point it at your Worker after deployment.                                 |
| Twilio account, Verify and Lookup | Phone verification and Lookup line-type intelligence support application access and VoIP checks.                         |
| Amazon SES or Resend account      | Sends password resets, inbox notices, and moderation email.                                                              |
| Operator email address            | Receives abuse alerts and is configured in `ADMIN_EMAILS`.                                                               |
| Moderation and legal process      | You are responsible for your instance's rules, privacy notice, abuse handling, data retention, and local-law compliance. |

Cloudflare Images must be enabled and its API token needs **Images Write** permission because the server uploads user photos through the Images API after reserving space in the account allowance. [Cloudflare Images uploads](https://developers.cloudflare.com/images/storage/upload-images/upload-custom-path/)

Keep secrets out of git. Use `.dev.vars` locally and Worker secrets in production.

## Instance-owned public content

Each instance must supply its own About page, Community Rules, Privacy Policy, and Terms of Use.
These pages are not upstream configuration and should not be copied from another operator. The
deployment configuration repository overlays four Markdown files at build time; see
[Deploy on Cloudflare](deploy-cloudflare.md#instance-policy-content).
