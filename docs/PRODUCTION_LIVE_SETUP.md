# Krypt Production Live Setup

Krypt production should run with the browser mock backend disabled. The Vercel deployment now includes a real `/api/rust/*` serverless API that stores data in Neon Postgres and can email new suggestions through Resend.

## Required Vercel Environment Variables

Set these for the Production environment:

```bash
REACT_APP_MOCKER_ENABLED=false
REACT_APP_API_BASE_URL=
REACT_APP_GOOGLE_CLIENT_ID=<google-web-client-id>

DATABASE_URL=<neon-pooled-postgres-url>
JWT_SECRET=<long-random-secret>
GOOGLE_CLIENT_ID=<google-web-client-id>
KRYPT_OWNER_EMAILS=<owner-email>
FEEDBACK_NOTIFY_EMAIL=<owner-email>
```

Optional, but needed for email notifications:

```bash
RESEND_API_KEY=<resend-api-key>
FEEDBACK_FROM_EMAIL=Krypt <onboarding@resend.dev>
```

For production email from your own domain, verify the domain in Resend and use a domain sender such as `Krypt <notify@askrypt.com>`.

## Free Services

- Neon free plan is enough for early Krypt feedback/auth/history storage.
- Resend free plan is enough for low-volume feedback notifications.
- Vercel Hobby functions are enough for the serverless API while traffic is small.

## Owner-Only Suggestions

The Suggestions page is available at `/suggestions`.

The nav link appears only when the API marks the signed-in user as an owner. The API checks `KRYPT_OWNER_EMAILS` on the server, so the owner list does not need to be exposed in the frontend bundle.

## Go-Live Checklist

1. Create a Neon project and copy the pooled connection string.
2. Create a long random `JWT_SECRET`.
3. Set both Google client ID env vars to the same web OAuth client ID.
4. Set owner email env vars to your Google login email.
5. Add Resend env vars if email notifications should be active immediately.
6. Deploy production.
7. Submit a test suggestion from the landing or home feedback form.
8. Confirm it appears at `/suggestions`.
9. Confirm the notification email arrives if Resend is configured.
