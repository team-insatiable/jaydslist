# Email delivery

Jaydslist uses one email interface for password resets, inbox notifications, moderation notices, abuse alerts, and beta waitlist confirmation. Choose a provider with `EMAIL_PROVIDER`.

## Amazon SES

Set these values in `.dev.vars` locally or as Worker secrets in production:

```dotenv
EMAIL_PROVIDER=ses
EMAIL_FROM="Jaydslist <notifications@your-domain.example>"
SES_ACCESS_KEY_ID=AKIA...
SES_SECRET_ACCESS_KEY=...
SES_REGION=us-west-2
```

Use an **IAM access key pair**, not Amazon SES SMTP credentials. The IAM identity needs `ses:SendEmail`. Temporary AWS credentials also require `SES_SESSION_TOKEN`.

The domain or sender in `EMAIL_FROM` must be a verified SES identity in the same `SES_REGION`. A custom MAIL FROM domain controls the bounce/return-path domain; it does not change the visible `From:` address.

## Resend

```dotenv
EMAIL_PROVIDER=resend
EMAIL_FROM="Jaydslist <notifications@your-domain.example>"
RESEND_API_KEY=re_...
```

If `EMAIL_PROVIDER` is omitted, an existing `RESEND_API_KEY` continues to select Resend for backward compatibility.

## Test delivery

Restart `pnpm dev` after editing `.dev.vars`, then request a password reset for an email address belonging to a local account. Development mode sends email normally.

To test an inbox notification, create a listing with Account A and use Account B to send the first message. The listing owner should receive the notification.

If SES rejects a request, the development terminal includes the AWS error. Common causes are swapped access-key values, an unverified sender, an incorrect region, missing `ses:SendEmail`, or a missing `SES_SESSION_TOKEN` for temporary credentials.
