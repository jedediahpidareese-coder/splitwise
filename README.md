# SplitWise

A small expense-splitting app for two people. Add a purchase, choose **who paid**
and **how it splits** (evenly, or the other person owes the full amount — a loan),
and see the running balance of who owes whom. Works as a website and installs to
your phone's home screen (PWA). Built to sync live between two phones via Supabase.

## Status

- **Phase 1 (now):** fully working UI, data stored locally in your browser. No
  accounts needed. Great for clicking through the whole experience.
- **Phase 3 (next):** Supabase cloud sync + sign-in, so both phones and the
  website share the same data in real time.

## Run it locally

```bash
npm install
npm run dev
```

Open the printed URL (usually http://localhost:5173). To try it on your phone on
the same Wi-Fi, run `npm run dev -- --host` and open the Network URL it prints.

The "reset" icon (top right) restores the original demo purchases.

## App icons

Already generated into `public/`. To regenerate after editing the design:

```bash
python -m pip install pillow   # one time
npm run icons
```

## Tech

React + Vite + TypeScript, Tailwind CSS, `vite-plugin-pwa`. The data layer
(`src/data/useStore.ts`) is isolated so it can be swapped from local storage to
Supabase without touching the UI.

## Hosting on GitHub Pages

`.github/workflows/deploy.yml` builds and deploys on every push to `main`.

1. Create a GitHub repo and push this project to it.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main`. The site publishes at `https://<you>.github.io/<repo>/`.

Because it's a PWA, that one deploy updates the website and both installed phones
at once.

### Cloud sync (phase 3)

Set repository secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
(**Settings → Secrets and variables → Actions**) and rebuild. Locally, copy
`.env.example` to `.env` and fill in the same values.
