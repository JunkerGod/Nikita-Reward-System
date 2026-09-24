# Nikita's Rewards

A private points and rewards app for two people: Jagath and Nikita. Nikita earns points for
good things, saves them up and spends them in a reward shop that Jagath stocks from inside the
app. Nikita also sets Jagath's level on the Boyfriend Behaviour Chart.

Everything that changes day to day (rewards, prices, activities, point values, face photos,
the chart level) is edited inside the app. No code changes needed.

## Features

Points and a reward shop, the Boyfriend Behaviour Chart with appeals, streak bonuses, undo,
coupons, milestone badges, special days (with a countdown and themed confetti), an
"Us, in Numbers" stats page, a monthly recap, phone notifications and photo memories from an
iCloud shared album.

## Stack

- Vite + React + TypeScript, built as a static site
- Tailwind CSS v4, Nunito and Great Vibes (self-hosted with Fontsource)
- GSAP (`gsap`, `@gsap/react`, Draggable) for all animation
- Supabase: database, login, private photo storage, live sync
- Phosphor icons
- Hosted on Netlify, with a daily scheduled function that keeps Supabase awake

Dependency versions are pinned exactly (`.npmrc` has `save-exact=true`).

## Project layout

```
src/
  App.tsx              shell, login gate, tab bar, page transitions
  lib/                 supabase client, data + live sync, router, copy (all app text), helpers
  screens/             Home, AddPoints, Shop, Chart, More, History, MyRewards, Settings, Login
  chart/               Behaviour Chart board, SVG decorations, Jagath's pop-up
  confetti/            the reusable face confetti
  components/          buttons, sheets, reward card/form, crop tool, toasts
supabase/migrations/   tables, security rules, storage bucket, starter data, keep-alive, features
supabase/functions/    push: sends web push notifications (deployed to Supabase)
netlify/functions/     keep-alive.mts (runs @daily), album.mts (reads the iCloud shared album)
public/sw.js           service worker: shows notifications, no caching
```

All message text lives in `src/lib/copy.ts`.

## Running locally

```bash
npm install
cp .env.example .env   # then fill in the two values
npm run dev
```

`npm run build` type-checks and builds to `dist/`.

## Environment variables

| Name | Where |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase dashboard, Project Settings, API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase dashboard, Project Settings, API Keys (the `sb_publishable_...` key) |

Both are set on Netlify for all contexts. The keep-alive function reads the same two.

## How logins work

The app asks for a username and password. Supabase Auth needs an email, so username `nikita`
signs in as `nikita@nikitas-rewards.local` (that address never gets mail). Each person's role
lives in the `profiles` table. Sessions are saved on the phone, so you log in once.

Public sign ups are blocked by a database trigger (`block_public_signups` on `auth.users`), so
nobody else can make an account even if they find the site.

## Security

Row Level Security is on for every table. Only the two accounts in `profiles` can read or
write anything. On top of that:

- only Jagath can add, edit, hide or delete rewards, mark rewards delivered and resolve wishes
- only Nikita can set the Behaviour Chart level, redeem and pick her "Saving for" goal
- points are only ever added as `earn` rows; spending happens inside `redeem_reward()`, which
  checks the balance, so the balance can never go below zero
- face photos are in a private bucket and only shown through signed URLs after login

## Data model

Points are a list of transactions. The balance is always the sum of them, so deleting an entry
fixes the balance by itself. See `supabase/migrations/20260924000001_schema.sql`.

## Notifications

- Phones subscribe from Settings (on iPhone the app must be added to the Home Screen first).
- Database triggers call `public.send_push()`, which uses `pg_net` to call the `push` Edge
  Function with a shared secret. The function sends the notification with `web-push`.
- VAPID keys, the push secret and the function URL live in Supabase Vault
  (`vapid_public`, `vapid_private`, `vapid_subject`, `push_secret`, `push_url`), never in git.
- A `pg_cron` job (`daily-push`, 21:00 UTC = 7am or 8am Sydney) sends special day and monthly
  recap notifications.

## Photo memories

The Memories page reads an iCloud shared album that anyone with the link can view. The link is
saved in Settings (`app_settings.icloud_album`), and `netlify/functions/album.mts` fetches it:
new-style links (`photos.icloud.com/shared/album/...`) through CloudKit's anonymous public
access, old-style links (`icloud.com/sharedalbum/#...`) through the sharedstreams web feed. Apple can change that feed without notice; if it stops working the page
falls back to an "Open in Photos" button.
