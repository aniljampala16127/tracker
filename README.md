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

