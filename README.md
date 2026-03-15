# SponsorTrack — Canada Spousal Sponsorship Tracker

Free, open community tracker for Canadian spousal sponsorship (IRCC) applications. No sign-up required — anyone can add and update entries, just like a shared Google Sheet.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Database**: Supabase (PostgreSQL) — free tier
- **Hosting**: Vercel — free tier
- **Auth**: None. Fully open, like a shared spreadsheet.

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/aniljampala16127/tracker.git
cd tracker
npm install
```

### 2. Set up Supabase (3 min)

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Once ready, go to **SQL Editor** → paste the contents of `supabase/migrations/001_initial_schema.sql` → click **Run**
3. Go to **Settings → API** and copy your **Project URL** and **anon public key**

### 3. Create environment file

```bash
cp .env.local.example .env.local
```

Fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → Import your repo
3. Add the two environment variables
4. Deploy — live in ~60 seconds

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout + nav
│   ├── globals.css               # Tailwind + fonts
│   ├── dashboard/
│   │   ├── page.tsx              # All applications + add form
│   │   └── [id]/page.tsx         # Application detail + step updates
│   ├── community/
│   │   └── page.tsx              # Community feed + monthly cohorts
│   ├── discussions/
│   │   └── page.tsx              # Live chat (Supabase Realtime)
│   ├── stats/
│   │   └── page.tsx              # Processing time analytics
│   └── api/
│       ├── applications/route.ts # CRUD applications
│       ├── steps/route.ts        # Record step events
│       ├── messages/route.ts     # Chat messages
│       └── community/route.ts    # Aggregated community data
├── components/
│   ├── icons/index.tsx           # Custom SVG icons
│   ├── ui/index.tsx              # Button, Badge, Input, Card, Modal...
│   ├── Nav.tsx                   # Top navigation
│   ├── AppCard.tsx               # Application summary card
│   └── StepTimeline.tsx          # Visual dot timeline
└── lib/
    ├── constants.ts              # Steps, countries, provinces
    ├── types.ts                  # TypeScript interfaces
    ├── utils.ts                  # Date helpers, calculations
    └── supabase/
        └── client.ts             # Supabase browser client
```

## Features

- **8-step timeline**: Submitted → AOR → Eligibility → Background → Medical → Biometrics → Decision → Landing
- **Add/edit/delete** any application — fully open, no account required
- **Mark steps done** with dates, see duration between steps
- **Estimated completion** range based on stream (Outland vs Inland)
- **Live chat discussion** — ask questions, share tips, real-time via Supabase Realtime
- **Community feed** with monthly cohort grouping
- **Filter** by stream (Outland/Inland) and country of origin
- **Stats page** with per-step processing averages, min/median/max
- **Country breakdown** analytics
- **IRCC reference times** alongside community-tracked data
- **Mobile responsive**

## Database

Three tables + one materialized view:

- **applications**: Initials, country, stream, province, current step
- **step_events**: Individual milestone records with dates (unique per app + step)
- **messages**: Chat messages with display name, body, timestamp (Realtime-enabled)
- **community_averages**: Auto-aggregated processing times by stream/country/step

All tables have open RLS policies (anyone can read/write). To refresh community averages:

```sql
SELECT refresh_community_averages();
```

Set up a Supabase cron extension or call this periodically to keep averages fresh.

## Planned

- [ ] CSV import (bulk-add from existing Google Sheets)
- [ ] Percentile bands (25th/50th/75th/95th)
- [ ] Processing time trend charts (getting faster or slower?)
- [ ] OWP parallel tracking
- [ ] IRCC processing time auto-scraper
- [ ] PWA support (installable)
- [ ] Optional anonymous token auth (cookie-based, to prevent trolling)

## License

MIT
