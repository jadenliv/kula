# CLAUDE.md — Torah Learning Tracker

## Project Overview
A Torah learning tracker web app that lets users browse, track, and take notes on all major Torah texts. Built on top of Sefaria's open API for text content and structure.

## Tech Stack
- **Frontend:** React (Vite) + TypeScript
- **Styling:** Tailwind CSS
- **Database & Auth:** Supabase (Postgres + Auth)
- **External APIs:** Sefaria API (texts), HebCal API (zemanim, Hebrew dates)
- **Deployment:** Vercel

## Coding Conventions
- Use functional React components with hooks. No class components.
- Use TypeScript strictly — no `any` types unless absolutely necessary.
- Keep components small and focused. One component per file.
- Use descriptive variable and function names. No abbreviations.
- API calls should be in dedicated service files (e.g., `services/sefaria.ts`, `services/hebcal.ts`), not inside components.
- Use React Query (TanStack Query) for API data fetching and caching.
- Supabase client should be initialized once in a `lib/supabase.ts` file.
- Environment variables for Supabase URL and anon key go in `.env.local` (never committed to git).

## Design Preferences
- Clean, minimal UI. Think calm and focused — this is a learning tool, not a social app.
- Dark mode by default with a light mode toggle.
- Mobile-responsive from the start. Many users will use this on their phone.
- Use a serif font for Hebrew text display and a clean sans-serif for UI elements.
- Generous whitespace. Don't crowd the interface.

## Transliteration and Terminology
This app serves a Jewish audience. Use standard English Jewish transliteration — not heavy Sephardi. No "q" for "k", no "th" for "t". Keep "kh" for chaf where it reads naturally.
- berakhah, halakhah, Shabbat
- masekhet, perek, mishnah
- Tanakh, Talmud Bavli, Mishneh Torah, Shulchan Arukh
- sefer (plural: sefarim), parashah (plural: parashiyot)
- Use "pesukim" not "verses", "perakim" not "chapters" in the UI
- Display Hebrew text right-to-left with proper Unicode support

## Sefaria API Notes
- Base URL: https://www.sefaria.org/api/
- No API key required
- Table of Contents: GET /api/index/
- Text retrieval: GET /api/texts/{ref} — returns Hebrew and English
- Text structure: GET /api/index/{title} — returns the schema/structure of a text
- The API returns different structures for different text types. Handle gracefully.
- Cache API responses aggressively using React Query with long stale times (texts don't change).

## HebCal API Notes
- Zemanim: https://www.hebcal.com/zmanim?cfg=json&latitude={lat}&longitude={lng}
- Hebrew date: included in zemanim response
- Holiday detection: https://www.hebcal.com/hebcal?v=1&cfg=json&year=now&month=now
- Use browser geolocation API to get user coordinates, with manual override option.

## File Structure (Target)
```
src/
  components/       # Reusable UI components
    ui/             # Base UI primitives (Button, Card, Modal, etc.)
    layout/         # Header, Sidebar, Navigation
    texts/          # Text browsing and display components
    tracking/       # Progress tracking components
    notes/          # Notes-related components
    timer/          # Clock in/out components
    zemanim/        # Zemanim display
  pages/            # Top-level page components
  services/         # API service layers (sefaria.ts, hebcal.ts, supabase.ts)
  hooks/            # Custom React hooks
  lib/              # Utilities, Supabase client init, constants
  types/            # TypeScript type definitions
  context/          # React context providers (auth, settings)
```

## Important Notes
- This is a learning project. Explain significant architectural decisions in comments.
- When encountering Sefaria API quirks, add a comment explaining the workaround.
- Prioritize working features over perfect code. We can refactor later.
- Always handle loading and error states for API calls.
- The app should work offline for already-loaded content where possible.
