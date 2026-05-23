# SponsorTrack — Web UI Kit

Interactive recreation of the SponsorTrack web product. Built as React/JSX components that mirror the structure of the live `src/components/` tree.

## Files

| File | What's inside |
| ---- | ------------- |
| `index.html` | Loads everything, mounts the demo |
| `Primitives.jsx` | `Button`, `Badge`, `Pill`, `Avatar`, `Card`, `Eyebrow`, `StatCard` — the building blocks |
| `Icons.jsx` | Bespoke SVG icon set (step + UI) |
| `Nav.jsx` | Sticky desktop header with sliding-pill tabs + fixed mobile bottom nav |
| `Timeline.jsx` | `StepTimeline` (compact, the 7-dot strip), `StepTimelineDetailed` (vertical with step icons), `ApplicantRow` |
| `Screens.jsx` | `LandingScreen` (guest), `DashboardScreen`, `MeScreen`, `DetailScreen`, `StatsScreen`, `CommunityScreen` |
| `App.jsx` | Root — fake routing, simulated "Add application" multi-step modal, toast |

## Click-thru paths

Open `index.html` and you start on the marketing landing (`/`). From there:

1. **"Add Your Application"** — opens the 3-step modal (initials/country/stream → submission date → PIN). On save you're "logged in" and routed to `/me`.
2. **PIN reconnect** — any 4-digit PIN matches in the demo and routes you to `/me`.
3. **Tracker tab** — the shared-spreadsheet view; the first row is marked YOU. Tap any row to see the detail screen.
4. **Stats tab** — the median-days-per-step bar chart.
5. **Community tab** — cohort threads.
6. **Me tab** — personalized timeline with a full 7-step vertical breakdown.

The bottom nav is functional on narrow viewports; resize the window or open DevTools mobile to see it.

## What's intentionally fake

- No real data. `SAMPLE_APPS` and `MILESTONES` arrays drive everything.
- No real PIN hashing — any 4 digits "works".
- Stats bars are static.
- No dark mode toggle wired up here (the live product flips a `.dark` class on `<html>`).

## Adding screens / variants

All components export to `window`. To add a new screen, drop a new `<MyScreen />` JSX file, expose it via `Object.assign(window, { MyScreen })` at the bottom, add it to the route map in `App.jsx`, and link a tab to it.

## Source

This kit is a hand-built recreation of the live product at https://sponsortrack.online (code: https://github.com/aniljampala16127/tracker). When in doubt, read the imported source under `src/` at the project root — that's the truth.
