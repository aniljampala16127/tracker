---
name: sponsortrack-design
description: Use this skill to generate well-branded interfaces and assets for SponsorTrack, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick orientation

- `README.md` — product context, content fundamentals, visual foundations, iconography
- `colors_and_type.css` — all tokens; `@import` it into any prototype to get the brand for free
- `assets/` — logo, app icon, favicon
- `ui_kits/web/` — interactive React kit with `Button`, `Card`, `StatCard`, `Avatar`, `StepTimeline`, the nav, plus 6 screens (Landing, Dashboard, Me, Detail, Stats, Community)
- `src/` — read-only mirror of the live Next.js source (the canonical truth)
- `preview/` — Design System tab cards (color, type, components)

The product: SponsorTrack — a free community tracker for Canadian spousal sponsorship (IRCC). Calm, warm, civic. Forest-green brand on sand neutrals. DM Sans. Cards with 1px sand borders. No emoji.
