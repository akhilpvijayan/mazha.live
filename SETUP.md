# Mazha.Live — Setup Guide

## Quick Start

```bash
npm install
cp .env.example .env.local
# fill in your keys (see below)
npm run dev
```

The app works **without Supabase** — reports are stored in memory (lost on refresh).  
Connect Supabase to get persistence + real-time sync + push notifications.

---

## 1. Create Supabase Project

1. Go to https://supabase.com → New Project (free tier)
2. Open **SQL Editor** and run the entire contents of `supabase/schema.sql`
3. Copy your **Project URL** and **anon public key** from Settings → API
4. Add them to `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

---

## 2. Generate VAPID Keys (Push Notifications)

```bash
npx web-push generate-vapid-keys
```

You'll get a public + private key pair.

- Add **public key** to `.env.local` as `VITE_VAPID_PUBLIC_KEY`
- Add **private key** to Supabase Edge Function secrets (below)

---

## 3. Deploy Push Notification Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set VAPID_PUBLIC_KEY=your-public-key
supabase secrets set VAPID_PRIVATE_KEY=your-private-key
supabase secrets set VAPID_EMAIL=mailto:you@yourdomain.com

# Deploy function
supabase functions deploy send-push
```

---

## 4. Set up DB Webhook (Trigger push on heavy rain)

In Supabase Dashboard → Database → Webhooks → Create:
- **Name**: `notify-heavy-rain`
- **Table**: `rain_reports`
- **Events**: INSERT
- **URL**: `https://your-project.supabase.co/functions/v1/send-push`
- **HTTP Headers**: `Authorization: Bearer your-service-role-key`
- **Filter** (optional): `intensity > 50`

---

## Environment Variables Summary

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `VITE_VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` |

---

## PWA Install

The app is installable as a PWA on:
- **Android**: Chrome → menu → "Add to Home Screen" / install banner
- **iOS**: Safari → Share → "Add to Home Screen"
- **Desktop**: Chrome/Edge → install icon in address bar

---

## Architecture

```
User submits report
  → pincodeService.ts (validates Kerala PIN, gets lat/lng)
  → supabase.ts insertRainReport() → Supabase DB
  → DB Webhook fires → Edge Function send-push
  → Push sent to all subscribers in that district
  → supabase.ts subscribeToReports() → real-time update for all open tabs
```
