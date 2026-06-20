# Push notifications setup (one time)

This turns on "ping the other person's phone when a transaction is added." There
are three parts: a database table, a small server function, and tapping "Allow"
on each phone. (No secret keys are stored in this repo — the private key is given
to you separately.)

## 1. Database table

Supabase → SQL Editor → run the contents of
`supabase/migrations/003_push_subscriptions.sql`. (Also run `002_settlement_approval.sql`
if you haven't yet.)

## 2. Deploy the `notify` function

**Option A — Supabase CLI (recommended):**

```bash
npm install -g supabase
supabase login
supabase link --project-ref rhmrsufiqftshhlqnskm
supabase functions deploy notify
supabase secrets set \
  VAPID_PUBLIC_KEY="<public key>" \
  VAPID_PRIVATE_KEY="<private key>" \
  VAPID_SUBJECT="mailto:jedediahpidareese@gmail.com"
```

(The VAPID key values are given to you in chat — keep the private one secret.)

**Option B — Dashboard:** Edge Functions → create a function named `notify`,
paste the contents of `supabase/functions/notify/index.ts`, deploy. Then under
the function's **Secrets**, add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and
`VAPID_SUBJECT`.

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided
to the function automatically — you don't set those.

## 3. Website build key

The hosted site needs the public VAPID key at build time. Add a GitHub repo
secret `VITE_VAPID_PUBLIC_KEY` (Settings → Secrets and variables → Actions), then
re-deploy. (This can be done for you.)

## 4. Turn it on — each phone

Open the installed app → tap the **bell** icon (top right) → **Allow**
notifications. Do this on both phones.

> On iPhone, push only works when the app has been **added to the home screen**
> and opened from that icon — not in the Safari tab.

## Test it

Add a purchase on one phone. The other phone should get a notification within a
few seconds. Settle-up requests and approvals notify too.
