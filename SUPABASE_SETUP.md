# Turning on cloud sync (Supabase)

This connects the app to a free cloud database so you and Dani share the same
data live across both phones and the website. It takes about 10 minutes, all in
the Supabase dashboard. You don't need to touch the code.

When you're done, the app automatically switches from "local mode" to
"signed-in, synced mode" — just by having the two keys in place.

---

## 1. Create a free Supabase project

1. Go to **https://supabase.com** → **Start your project** → sign in with GitHub.
2. **New project**. Name it `splitwise`. Choose a region near you. Set a database
   password (save it somewhere; you won't need it day-to-day).
3. Wait ~2 minutes for it to finish provisioning.

## 2. Create the database

1. In the left sidebar, open **SQL Editor** → **New query**.
2. Open the file `supabase/schema.sql` from this project, copy **all** of it,
   paste it into the editor, and click **Run**.
3. You should see "Success. No rows returned." That created the tables, security
   rules, realtime, and the receipts photo bucket.

## 3. Lock it down to just the two of you

1. **Authentication → Sign In / Providers → Email** (or **Authentication →
   Policies/Settings** depending on the dashboard version).
2. Turn **off** "Allow new users to sign up" (sometimes labeled **Enable
   sign-ups**). This stops strangers from creating accounts.
3. Now create your two accounts: **Authentication → Users → Add user → Create
   new user**. Do this twice:
   - your email + a password, with **Auto Confirm User** checked
   - Dani's email + a password, with **Auto Confirm User** checked

   (You can use any passwords; you'll each just sign in once on your phone.)
4. **You're already locked down — nothing to do here.** The app has no public
   "sign up" page at all (the screen only lets people sign *in*), you turned
   sign-ups off in the step above, and the database caps the whole app at two
   accounts and only lets those two read or write your data. So even a stray
   sign-up could never see anything.

## 4. Copy your two keys into the app

1. **Project Settings → API**.
2. Copy the **Project URL** and the **anon / public** key.
3. In this project, copy `.env.example` to a new file named `.env` and fill in:

   ```
   VITE_SUPABASE_URL=https://YOURPROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key...
   ```

   (The anon key is meant to be public — your data is safe because of the
   security rules from step 2.)

## 5. Try it locally

```bash
npm run dev
```

Open the printed URL. You should now see a **Sign in** screen instead of the
demo. Sign in with the account you made for yourself, pick your display name,
and you'll land on the home screen. Have Dani sign in too (on her phone, or just
sign out and in as her) and set her name — then the shared balance is live.

> Both of you need to sign in once so the app knows who's who. Until Dani signs
> in the first time, you'll see an "almost there" screen.

## 6. Make the live website sync too

Once you've pushed the project to GitHub (see `README.md`):

1. In your GitHub repo: **Settings → Secrets and variables → Actions → New
   repository secret**. Add two secrets with the **same values** as your `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Re-run the deploy (push any change, or **Actions → Deploy → Run workflow**).

Now the hosted site and both installed phones all share the same live data.

---

### Notes / options

- **Receipt photos** go in a public storage bucket with unguessable filenames.
  If you'd rather keep them fully private, tell me and I'll switch to signed
  URLs.
- **Forgot a password?** Reset it from **Authentication → Users** in the
  dashboard.
- If something doesn't work, send me the error shown on screen (or from the
  browser console) and I'll fix it.
