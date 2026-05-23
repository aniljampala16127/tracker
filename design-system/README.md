# SponsorTrack Design System

> A free community tracker for Canadian spousal sponsorship (IRCC) applications. This design system captures its visual language — warm, calm, hopeful, civic — so future surfaces stay coherent.

**Live product:** sponsortrack.online
**Tagline:** "Track your Canada spousal sponsorship."

## What SponsorTrack is

SponsorTrack is a public, no-sign-up community tracker — like a shared Google Sheet — where Canadian spousal-sponsorship applicants log where they are in IRCC's process (Submitted → AOR → BIL → Medical → Background → Portal 1 → Portal 2 → eCoPR). Anyone can browse aggregate processing-time stats and see the cohort that submitted the same week as them. Returning users prove ownership of an entry with a 4-digit PIN.

The product is one Next.js 14 app with several surfaces:

| Surface | Role |
| ------- | ---- |
| `/` Landing | Hero, live stat strip, "how it works", recent milestones |
| `/dashboard` | The full applications table — the "shared spreadsheet" core |
| `/me` | Personalized timeline for the logged-in PIN |
| `/dashboard/[id]` | One application's step-by-step detail |
| `/stats` | Charts and processing-time analytics (recharts) |
| `/calculator` | "When will I finish?" predictor based on cohort averages |
| `/community` | Threaded comments / cohort chat |
| `/compare` | Side-by-side timeline diff |
| `/cohort/[id]` | Group view for people who submitted near the same date |

All surfaces share the same chrome (sticky top nav on desktop, sliding-pill bottom nav on mobile) and the same design tokens.

## Sources

This design system was built by reading the SponsorTrack codebase directly. Sources you can explore for higher fidelity:

- **GitHub:** https://github.com/aniljampala16127/tracker — the canonical Next.js 14 + Tailwind + Supabase app. `src/app/globals.css` and `tailwind.config.ts` are the source of truth for tokens; `src/components/ui/` and `src/components/icons/` hold the building blocks. Pull any component on demand for higher-fidelity work.

## Tech context (for designers who'll build with this)

- **Stack:** Next.js 14 App Router, Tailwind CSS 3.4, Supabase, recharts
- **Font:** DM Sans (400/500/600/700) via Google Fonts
- **Theme:** light + dark, toggled via a `.dark` class on `<html>`; tokens flip via CSS vars
- **Identity:** no accounts — a 4-digit PIN bound to localStorage proves ownership
- **PWA:** installable; icon-192/512 + manifest.json in `assets/`

## Index — files in this system

```
README.md                    ← you are here
SKILL.md                     ← Claude Agent Skill manifest
colors_and_type.css          ← all design tokens, semantic + raw
assets/                      ← logo, app icon, favicon
  sponsortrack-icon.svg
  sponsortrack-icon-192.png
  sponsortrack-icon-512.png
  favicon.ico
preview/                     ← Design System tab cards
ui_kits/web/                 ← interactive web UI kit (the React product)
  index.html                 ← clickable demo
  README.md
  *.jsx                      ← Nav, AppCard, StatCard, Badge, Button, etc.
src/                         ← imported source from the live repo (read-only reference)
public/                      ← original app icons from the repo
```

Read on for content guidelines, visual foundations, and iconography. When in doubt, **read the imported source** — it's the truth, not this doc.

---

## CONTENT FUNDAMENTALS

SponsorTrack writes for **stressed, hopeful people waiting on a government decision.** Every line of copy lands somewhere on the axis between *calm reassurance* and *factual transparency*. Never sales-y; never bureaucratic.

### Voice

- **Friendly second-person.** "Track your Canada spousal sponsorship." "Add your application." "Know where you stand." The product talks to *you*, not about *the user*.
- **Communal.** "the community", "300+ applicants", "Join 300+ applicants", "Submitted same week" — the value prop is *you're not alone in this queue*.
- **Cautious about claims.** Always pairs predictions with disclaimers: *"Community-reported data."* *"Not affiliated with IRCC or the Government of Canada."* This is a trust product; over-promising would break it.
- **Action-first verbs.** "Add", "Track", "See", "Get", "Reconnect", "Reach". No marketing fluff like "Unlock" or "Discover".

### Tone

- **Calm, grounded, slightly hopeful.** Confetti, "milestones", "celebration wall" — but always restrained. Never exclamation marks in body copy; only at true moments of completion.
- **Plain English, IRCC-aware.** Uses IRCC's own step names (AOR, BIL, eCoPR, Inland, Outland, Portal 1, Portal 2). Doesn't translate them — assumes the reader recognizes them, because they're living them.
- **Numbers + verbs > adjectives.** "Avg AOR · 87d" beats "Fast processing". The product earns trust by showing data, not by adjective-stacking.

### Casing

- **Sentence case for headings.** *"How it works"*, *"Recent milestones"*, *"Your application"* — never Title Case like a marketing site.
- **ALL CAPS for eyebrows only.** Tiny 10–11px labels above a stat or section get `text-transform: uppercase` + `letter-spacing: 0.06em` + sand-500 color. Used everywhere ("YOUR APPLICATION", "SUBMITTED SAME WEEK", "TOTAL", "COUNTRIES").
- **Step IDs always capitalized as IRCC writes them.** *AOR*, *BIL*, *eCoPR*, *PA*. Never lowercased.

### Person + pronouns

- **You** for the reader. **The community** / **applicants** for everyone else. Never "we" — the brand recedes; the data and the user stand front.
- "**Me**" is a UI label (the bottom-nav tab for the logged-in user's view), but body copy still says "your" / "you".

### Specific examples (lifted verbatim from the app)

| Where | Copy |
| ----- | ---- |
| Hero | "Track your Canada **spousal sponsorship**" |
| Hero subhead | "See real processing times from the community. Know where you stand. Get predicted dates for every step." |
| Hero pill | "300 applications tracking live" |
| Primary CTA | "Add Your Application" |
| Secondary | "View Analytics →" |
| PIN reconnect | "Already tracking? Enter your PIN" → "Reconnect" |
| Empty state | "No other entries submitted the same week" |
| Footer | "SponsorTrack · Not affiliated with IRCC · Community-reported data" |
| Milestone line | "**JK** reached **AOR** · 2h ago" |
| CTA card | "Join **300+** applicants — Free forever. No sign-up. Takes 30 seconds." |
| Disclaimer | "All data is community-reported. No personal information is collected." |

### Emoji + emoticons

**Not used.** No emoji in nav, headers, copy, or microcopy. The product carries serious emotional weight (immigration is stressful) and emoji would feel flippant. The one playful affordance — **Confetti** on milestone completion — is a CSS animation, not 🎉.

### Numerals

- Use digits, not words: "300+ applicants", "4-digit PIN", "Day 87", "Avg 87d".
- Days are abbreviated to **d** in compact contexts ("87d") and spelled out in prose ("Day 87").
- Counts get `+` when approximate ("300+", "Join 300+ applicants").

### Microcopy tics

- Trailing arrows on inline links: `"View details →"`, `"See all →"`, `"Browse all entries →"`.
- Loading: `"..."` ellipsis, not spinners-with-text.
- Live pulse dot before live counts: `● 300 applications tracking live`.

---

## VISUAL FOUNDATIONS

### The visual idea

A **warm, paper-like calm** — sand-toned neutrals, deep forest-green brand, gold-leaf warn accent. Reads more like a thoughtful civic publication than a SaaS dashboard. Lots of whitespace, lots of cards, no aggressive gradients, no glass. The visual restraint is the message: *this is a serious thing being tracked, by real people, transparently.*

### Color

- **Brand green `#2D6A4F`** — the workhorse. Primary buttons, the bottom-nav active pill, links, "you" highlights, milestone checkmarks. Echoes the Canadian flag's forest green and the IRCC pine logo without copying them.
- **Sand scale `#FAFAF8 → #1A1A18`** — warm off-white neutrals (4–6% yellow undertone, NOT pure gray). `sand-50` is the page background everywhere; `sand-200` is every card border; `sand-500` is muted body; `sand-900` is heading text.
- **Gold/warn `#D4A03C`** — used sparingly for the *Outland* stream badge, warnings, and the warm gradient corner accent on hero sections. Never for primary actions.
- **Terracotta/error `#C05746`** — destructive only. Delete buttons, PIN-error shake state, unread-count badge.
- **No purple, no blue, no pink.** The palette is intentionally narrow — green + sand + occasional gold.

Dark mode reverses the sand scale (`sand-50` becomes the darkest) and brightens the brand greens. All tokens flip via `.dark`.

### Type

- **DM Sans, 400/500/600/700.** One family across the whole product. Variable Helvetica Neue fallback.
- **Tight letter-spacing on display sizes** (`tracking-tight` / `-0.02em` on h1, h2). Loose tracking only on eyebrow caps (`0.06–0.08em`).
- **Heavy use of `font-bold` (700) for headings and stat values**, `font-semibold` (600) for labels and CTAs, `font-medium` (500) for inline links. Body is plain 400.
- **Tabular numbers** are NOT explicitly applied — recharts axes and stat cards use DM Sans default figures.

### Spacing + layout

- **5-column max-width container:** `max-w-5xl` (1024px) + `px-4` on mobile, centered. Most pages stack vertically in this column.
- **4-pt grid.** Tailwind defaults (`gap-2`, `gap-3`, `gap-4`, `p-4`, `p-5`, `p-6`). Cards are almost always `p-4` or `p-5`.
- **Generous internal padding, tight outer.** Cards have `p-4–p-6` inside but sit `gap-3` apart.
- **Sticky chrome.** Desktop header is `h-12` (48px) sticky; mobile bottom nav is fixed `~64px` with safe-area-inset padding for iOS notches.

### Backgrounds

- **Solid sand-50 page background.** No textures, no patterns, no full-bleed imagery.
- **One soft tinted-gradient corner-glow** on the hero: `bg-gradient-to-br from-brand-500/5 via-transparent to-warn/5`. Almost invisible — adds warmth, not drama.
- **No hand-drawn illustrations, no stock photos, no full-bleed images.** The visual identity rests entirely on type, color, geometry.

### Cards (the dominant primitive)

The product is built almost entirely out of **rounded white cards on sand-50**:

```
background:   #FFFFFF
border:       1px solid var(--sand-200)        ← always a 1px border, not a shadow
border-radius: 12px (rounded-xl) — sometimes 16px (rounded-2xl) for modals
padding:      16px–24px (p-4 / p-5 / p-6)
shadow:       NONE by default
              hover: shadow-md (0 4px 12px rgba(0,0,0,0.08))
              "active" CTAs: shadow-lg with brand tint
```

Cards rarely use shadows at rest — they're defined by their 1px sand border. Only *floating* surfaces (modals, dropdowns, primary CTAs) get shadows.

### Borders + radii

- **Default radius scale:** 6 (badge) → 8 (button, input) → 12 (card) → 16 (modal) → pill (badges with pulse).
- **Every card border is `1px solid sand-200`.** Never 2px, never colored borders for cards.
- **Colored 2px borders** are reserved for emphasis: the "YOU" entry row gets `border-b-2 border-brand-200`.

### Shadows + elevation

- **Resting:** `shadow-sm` or none. Cards rest flat.
- **Hover on cards:** `hover:shadow-md` (`0 4px 12px rgba(0,0,0,0.08)`).
- **Primary CTAs only:** `shadow-lg shadow-brand-500/20` — a soft green halo. This is the *one* place brand tint bleeds into a shadow.
- **No inner shadows. No double shadows. No glow.**

### Hover states

- **Buttons:** background shifts one step darker (`brand-500 → brand-600 → brand-700`); never opacity.
- **Cards / list rows:** background tints to `sand-50` (or `brand-50` for "your" rows); border can shift to `brand-300`.
- **Icon buttons in nav:** text color `sand-500 → sand-800`, background `sand-100`.

### Press / active states

- **Scale shrink:** `active:scale-[0.97]` to `active:scale-[0.99]` on all tappable surfaces. This is the signature interaction — every clickable card and button shrinks ~2% on press, no exceptions.
- **Background darkens one step further** (`active:bg-brand-700`).
- **Mobile nav taps trigger haptic** (`navigator.vibrate(8)`) plus a `scale-90` on the tab icon.

### Transparency + blur

- **Mobile bottom nav:** `bg-white/80 backdrop-blur-xl` — the only major blurred surface in the app.
- **Modal backdrop:** `bg-black/30` plain, no blur.
- **Tinted overlays:** `bg-brand-500/5`, `bg-brand-500/10`, `bg-warn/10` for emphasis rows and pulse dots. Always low opacity (5–15%).

### Animation

- **House easing:** `cubic-bezier(0.22, 1, 0.36, 1)` (a Quad-out variant — soft landing, no overshoot). Used for slides, modals, page transitions.
- **Pop easing:** `cubic-bezier(0.34, 1.56, 0.64, 1)` — slight overshoot, reserved for celebration moments (step completion, checkmark draw, dot fill).
- **Durations:** 150ms fast (hovers), 250ms base (modals, transitions), 400ms slow (entry glow, step complete).
- **Sliding-pill nav indicator** — animates `left + width` with the base easing.
- **Confetti CSS animation** on milestone completion (no library). Discrete and short — ~2s.
- **Skeletons** use a shimmer keyframe (200% background-position) at 2s linear.
- **Reduce-motion not currently respected** — flag for future.

### Layout rules

- **Page top-padding** is contributed by the page wrapper (`pt-6` / `pt-8`), not the nav. Many landing sections use `-mx-4 -mt-6` to escape the parent container's gutter and bleed full-width within `max-w-5xl`.
- **Mobile-first.** Almost all components have explicit mobile (default) and `sm:` (640px+) variants.
- **Safe areas honored** via `env(safe-area-inset-bottom)` so the bottom nav and footer clear the iOS home indicator.
- **Fixed elements:** the top header (sticky, `z-40`) and the mobile bottom nav (fixed, `z-50`). Modals use `z-50` and lock scroll with `overflow-hidden`.

### Imagery vibe

- **Almost no photographic imagery.** The product is data-driven.
- **OG image (`/api/og`)** is a generated SVG-as-image: forest green block + DM Sans white headline + the icon. Same calm tone.
- **Avatars** are 2-letter initials in a `brand-100` filled circle with `brand-600` text. No photos, no gradients.

### Corner radii cheat-sheet

| Element | Radius |
| ------- | ------ |
| Badge / pill | 6px or full-pill |
| Button | 8–12px (`rounded-lg` / `rounded-xl`) |
| Input | 8px |
| Card | 12px (`rounded-xl`) |
| Modal | 16px desktop, top-only 16px mobile (bottom sheet) |
| Avatar | full circle |
| App icon | 96px on a 512px artboard (~18.75%) |

---

## ICONOGRAPHY

SponsorTrack ships its **own bespoke SVG icon set**, not an icon font, not a library. Every icon is a hand-written React component in `src/components/icons/index.tsx`. The set is small (~25 glyphs) and tuned exactly to the product's needs — one icon per IRCC step, plus a handful of UI utilities.

### Style rules

- **1.8 stroke width** on most icons, 2.0 on small UI utilities (close, plus, chevron), 1.6 on the airplane.
- **`stroke="currentColor"`** — icons inherit their color from CSS. They're rendered in `sand-500` muted, `brand-500` for the active step, and `white` on the bottom-nav active pill.
- **Round caps + round joins** (`strokeLinecap="round" strokeLinejoin="round"`) — the geometry feels soft.
- **No filled icons** except the avatar dots and the Google sign-in logo (the one place full color is used).
- **Default size 16–20px** at usage; defined as props with a default. Bottom-nav icons render at 16px, hero step icons at 20px.
- **24×24 viewbox** for every icon in the set.

### The icon set

**Step icons** (one per IRCC stage, used in the timeline + step chart):
`Submitted` (paper plane), `AOR` (checkmark box), `BIL` (shield), `Sponsor Eligibility` (person + check), `PA Eligibility` (person + check, offset), `Medical` (cross), `Background` (document + circle), `Pre-arrival` (mountain ranges), `Portal 1 / Portal 2` (monitor + arrow), `Decision` (checked circle), `eCoPR` (house), `Landing` (house, alias).

**UI icons:** `Plus`, `Close`, `Trash`, `Calendar`, `Clock`, `Check`, `Chevron-right`, `Arrow-left`, `Plane`, `Users`, `User`, `BarChart`, `Chat`, `LogOut`.

**Brand icons:** `Google` (full-color, for Google sign-in only — though sign-in isn't used yet).

### App icon / logo

The product logo is `assets/sponsortrack-icon.svg`: a green rounded-square tile (`#2D6A4F`, 96px radius on 512) showing **three concentric circles** progressing left-to-right (faint → bold) bisected by a **gold arrow** (`#D4A03C`) and crowned by a white checkmark on the third dot. Reads as *progression along a tracked path*, which is the whole product in one mark.

The wordmark is just the text "SponsorTrack" in DM Sans 700, sand-900. No accompanying tagline in the chrome.

### Emoji + unicode

- **No emoji**, anywhere. Not in headings, not in microcopy, not in badges.
- **Unicode arrows** are used as inline link affordances: `→` after "View details", "See all", "Browse all entries", "View Analytics".
- **Bullet points** are sometimes spaced with a ` · ` middle-dot (`{country} · {sponsor_status} · {stream}`) — characteristic of the product's "compact metadata row" pattern.

### When to substitute

If you need a step or utility icon SponsorTrack doesn't ship, the closest match is **Lucide** (https://lucide.dev) — same stroke style, same 24-viewbox, same round caps. **Flag the substitution in the file you're working on** so a designer can decide whether to commission a bespoke glyph.

---

## When in doubt

1. Read the actual source in `src/` — it's the truth, not this doc.
2. Open the repo on GitHub (link at the top) and explore further surfaces — the codebase is small and very legible.
3. Stick to the four colors (sand / brand / warn / error) and DM Sans. The rest is composition.
