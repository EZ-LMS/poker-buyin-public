# Poker Buy-in

A home poker game buy-in and settlement tracker. Track player buy-ins, final chip counts, and automatically calculate who owes whom.

## Features

- **Create & manage games**: Start a new poker game, add players, track buy-ins
- **Live updates**: Real-time sync across players with QR code join
- **Flexible settlement**: 
  - Normal settlement when books balance
  - Force settlement with discrepancy recording when books don't match
- **Leaderboard**: All-time P/L tracking per player
- **History**: View past games and their settlements

## Demo

Live demo: https://poker-buyin-public.vercel.app

(This is a shared demo database. For production use, deploy your own instance below.)

## Self-Hosted Setup

### 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Wait for the project to initialize
3. Go to **SQL Editor** and run the migration from `supabase/schema.sql`:
   - Copy the entire content of `supabase/schema.sql`
   - Paste into the SQL editor
   - Click "Run"

### 2. Get Your API Keys

1. Go to **Settings → API**
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`

### 3. Deploy to Vercel

1. Fork this repo
2. Go to [Vercel](https://vercel.com) and import the repo
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

Or deploy anywhere that supports Node.js + static builds.

### 4. Local Development

```bash
npm install
npm run dev
```

Create `.env.local` with your Supabase keys (copy from `.env.example`).

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
- **Backend**: Supabase (PostgreSQL), Realtime subscriptions
- **Routing**: React Router v7
- **Deploy**: Vercel

## License

MIT
