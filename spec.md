# Torah Learning Tracker — Specification

## Overview
A web app for browsing, tracking, and taking notes on all major Torah texts. Built on Sefaria's open API for text content and structure, with Supabase providing auth and persistence. The goal is a calm, focused learning tool that meets a learner wherever they are in Tanakh, Talmud, Mishneh Torah, and beyond.

## Tech Stack
- **Frontend:** React (Vite) + TypeScript
- **Styling:** Tailwind CSS
- **Data fetching:** TanStack Query (React Query)
- **Database & Auth:** Supabase (Postgres + Auth)
- **External APIs:**
  - Sefaria API — `https://www.sefaria.org/api/` (texts, index, structure; no key)
  - HebCal API — `https://www.hebcal.com/` (zemanim, Hebrew dates, holidays; no key)
- **Deployment:** Vercel

## Terminology
Standard English Jewish transliteration — no "q" for "k", no "th" for "t". Use: berakhah, halakhah, Shabbat, masekhet, perek, mishnah, Tanakh, Talmud Bavli, Mishneh Torah, Shulchan Arukh, sefer/sefarim, parashah/parashiyot, pesukim, perakim.

## Data Model (Supabase)

### `profiles`
| column | type | notes |
|---|---|---|
| `user_id` | uuid (PK, FK → `auth.users.id`) | |
| `display_name` | text | |
| `latitude` | double precision | nullable |
| `longitude` | double precision | nullable |
| `created_at` | timestamptz | default `now()` |

### `learning_tracks`
| column | type | notes |
|---|---|---|
| `id` | uuid (PK) | default `gen_random_uuid()` |
| `user_id` | uuid (FK → `auth.users.id`) | |
| `name` | text | |
| `sefaria_index` | text | Sefaria index title key |
| `track_type` | text | `'cycle'` or `'self-paced'` |
| `daily_target` | int | units/day |
| `start_date` | date | |
| `is_active` | boolean | default `true` |
| `created_at` | timestamptz | default `now()` |

### `completions`
| column | type | notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK) | |
| `sefaria_ref` | text | e.g., `"Berakhot 2a"`, `"Genesis 1:1"` |
| `learning_track_id` | uuid (FK, nullable) | |
| `completed_at` | timestamptz | default `now()` |

### `notes`
| column | type | notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK) | |
| `sefaria_ref` | text | |
| `content` | text | |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` |

### `time_logs`
| column | type | notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK) | |
| `sefaria_ref` | text | nullable |
| `learning_track_id` | uuid (FK, nullable) | |
| `clock_in` | timestamptz | |
| `clock_out` | timestamptz | nullable |
| `duration_minutes` | int | computed on clock out |

### Row Level Security
All tables have RLS enabled. Users can only read and write rows where `user_id = auth.uid()`.

## External API Usage

### Sefaria
- `GET /api/index/` — full table of contents tree (categories → sefarim). Cache aggressively.
- `GET /api/index/{title}` — schema/structure for a specific sefer.
- `GET /api/texts/{ref}` — Hebrew + English for a reference. Cache aggressively (texts are immutable).
- The API returns different structures for different text types (Tanakh vs. Talmud vs. Rambam etc.). The tree renderer must adapt to whatever schema comes back per sefer.

### HebCal
- Zemanim: `GET /zmanim?cfg=json&latitude={lat}&longitude={lng}` — includes Hebrew date.
- Holidays: `GET /hebcal?v=1&cfg=json&year=now&month=now`.
- Use browser geolocation with manual override. Persist lat/lng on `profiles`.

## Feature Milestones

### Milestone 1 — Navigation and Structure
- Supabase email/password auth (sign up, sign in, sign out, session persistence).
- Browse all Sefaria texts via a navigable tree: categories → sefarim → sections → granular units.
  - Tanakh: book → perek → pasuk.
  - Talmud: masekhet → perek → daf.
  - Rambam: book → section → perek → halakhah.
  - Adaptive to Sefaria's per-text schema.
- Clicking a granular unit opens inline text (Hebrew RTL + English) fetched from Sefaria.
- Location-based zemanim display (persistent in header/sidebar), sourced from HebCal.

### Milestone 2 — Progress Tracking
- Mark sections complete at any granularity.
- Hierarchical completion percentages (perek → sefer → category → overall).
- Visual progress indicators at every tree level.
- Learning tracks with daily targets, current position, streaks.
- Streaks exclude Shabbath and Yom Tov via HebCal.

### Milestone 3 — Notes and Time Logging
- Notes attached to any Sefaria reference; timestamped, editable.
- Dedicated notes view with search and browse.
- Clock in / clock out timer tied to a ref or track.
- Time analytics: today, this week, by track, by sefer.

### Milestone 4 — Polish and Analytics
- Analytics dashboard: completion heatmap, time charts, streak history, notes activity.
- Mobile-responsive polish pass.
- Hebrew calendar integration (today's Hebrew date, parashat hashavua).

## Design Principles
- Clean, minimal, calm. Dark mode default with a light toggle.
- Mobile-responsive from the start.
- Serif font for Hebrew, sans-serif for UI.
- Generous whitespace.
- Always handle loading and error states for API calls.
- Cache Sefaria responses with long stale times (texts are immutable).

## Target File Structure
```
src/
  components/
    ui/             # Button, Card, Modal, Spinner, etc.
    layout/         # Header, Sidebar, AppShell
    texts/          # TextTree, TextNode, TextViewer
    tracking/       # (Milestone 2)
    notes/          # (Milestone 3)
    timer/          # (Milestone 3)
    zemanim/        # ZemanimPanel
  pages/            # Landing, SignIn, SignUp, Browse, Reader
  services/         # sefaria.ts, hebcal.ts, supabase.ts
  hooks/            # useAuth, useSefariaIndex, useSefariaText, useZemanim
  lib/              # supabase client, constants, utils
  types/            # sefaria.ts, supabase.ts, domain.ts
  context/          # AuthContext, SettingsContext
```
