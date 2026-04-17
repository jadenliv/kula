# Milestone 1 — Navigation and Structure

Goal: a signed-in user can browse the full Sefaria table of contents as a navigable tree, drill down to any granular unit (pasuk / daf / halakhah), read the Hebrew + English inline, and see live zemanim for their location.

## 1. Project Setup
- [ ] Initialize Vite + React + TypeScript project in `Kula/`
- [ ] Install Tailwind CSS and configure `tailwind.config.js` + `index.css` with base layer
- [ ] Install dependencies: `@supabase/supabase-js`, `@tanstack/react-query`, `react-router-dom`
- [ ] Configure TypeScript strict mode in `tsconfig.json`
- [ ] Create `.env.local` (gitignored) with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] Add `.env.example` documenting required env vars
- [ ] Create target directory structure under `src/` per spec.md
- [ ] Set up ESLint + Prettier
- [ ] Verify dev server boots (`npm run dev`)

## 2. Supabase Setup
- [ ] Create Supabase project
- [ ] Enable email/password auth in Supabase dashboard
- [ ] Write SQL migration for `profiles` table (only table needed for Milestone 1)
- [ ] Enable RLS on `profiles`; add policies so users can only read/write their own row
- [ ] Add trigger (or client-side insert) to create a `profiles` row on user signup
- [ ] Initialize Supabase client in `src/lib/supabase.ts` (single instance)

## 3. Auth Flow
- [ ] Create `AuthContext` in `src/context/AuthContext.tsx` wrapping Supabase session
- [ ] `useAuth` hook exposing `user`, `session`, `signIn`, `signUp`, `signOut`, `loading`
- [ ] `pages/SignUp.tsx` — email + password + display name form, handle errors and loading
- [ ] `pages/SignIn.tsx` — email + password form, handle errors and loading
- [ ] `components/ui/Button.tsx`, `Input.tsx`, `Card.tsx`, `Spinner.tsx` primitives
- [ ] Wire up `react-router-dom` with protected route wrapper (`<ProtectedRoute>`)
- [ ] Session persists across reloads; sign-out clears it
- [ ] Manual test: sign up → email verification flow → sign in → sign out

## 4. App Shell & Layout
- [ ] `components/layout/AppShell.tsx` — header + sidebar + main outlet
- [ ] `components/layout/Header.tsx` — app title, user menu (sign out), zemanim slot
- [ ] `components/layout/Sidebar.tsx` — navigation links (Browse, future tabs)
- [ ] Dark mode by default; class-based Tailwind dark mode config
- [ ] Light mode toggle (persist preference to localStorage)
- [ ] Mobile responsive: sidebar collapses to drawer on small screens
- [ ] Load Hebrew serif font (e.g., Frank Ruhl Libre or David Libre) and UI sans-serif

## 5. Sefaria Service Layer
- [ ] `src/types/sefaria.ts` — types for `SefariaIndexNode`, `SefariaText`, `SefariaSchema`
- [ ] `src/services/sefaria.ts`:
  - [ ] `fetchIndex()` → GET `/api/index/`
  - [ ] `fetchIndexDetails(title: string)` → GET `/api/index/{title}`
  - [ ] `fetchText(ref: string)` → GET `/api/texts/{ref}`
  - [ ] Proper URL encoding of refs
  - [ ] Error handling with typed errors
- [ ] Configure React Query `QueryClient` with long `staleTime` for Sefaria queries (texts are immutable)
- [ ] Custom hooks: `useSefariaIndex()`, `useSefariaIndexDetails(title)`, `useSefariaText(ref)`

## 6. Text Tree (Browse)
- [ ] `pages/Browse.tsx` — top-level categories from `/api/index/`
- [ ] `components/texts/TextTree.tsx` — recursive category/sefer tree
- [ ] `components/texts/TextNode.tsx` — single expandable node, handles lazy loading of children
- [ ] On leaf sefer click: fetch `/api/index/{title}` and render its schema-driven structure
- [ ] Adaptive schema renderer that handles:
  - [ ] Tanakh structure (book → perek → pasuk)
  - [ ] Talmud structure (masekhet → perek → daf a/b)
  - [ ] Rambam / Mishneh Torah (book → section → perek → halakhah)
  - [ ] Fallback recursive handling for other text types
- [ ] Comment in code explaining why adaptive rendering is required (Sefaria schema variance)
- [ ] Handle loading and error states at every tree level

## 7. Text Reader
- [ ] `pages/Reader.tsx` (route: `/read/:ref`) — uses `useSefariaText` on URL param
- [ ] `components/texts/TextViewer.tsx` — displays Hebrew + English side by side (or stacked on mobile)
- [ ] Hebrew column: RTL (`dir="rtl"`), serif font, correct Unicode rendering
- [ ] English column: LTR, sans-serif
- [ ] Handle `ref` not found, API errors, loading spinner
- [ ] Clicking a granular unit in the tree navigates to the reader

## 8. Zemanim (HebCal)
- [ ] `src/types/hebcal.ts` — types for zemanim response
- [ ] `src/services/hebcal.ts`:
  - [ ] `fetchZemanim(lat, lng)` → GET `/zmanim?cfg=json&...`
- [ ] `hooks/useZemanim.ts` — React Query, refetch on location change
- [ ] `hooks/useGeolocation.ts` — browser geolocation with manual override
- [ ] On first sign-in, prompt for location permission; save lat/lng to `profiles`
- [ ] `components/zemanim/ZemanimPanel.tsx` — shows key zemanim (alot, netz, chatzot, minchah gedolah, sheqi'ah, tzeth)
- [ ] Display today's Hebrew date alongside zemanim
- [ ] Mount panel in header (desktop) / sidebar drawer (mobile), persistent across routes
- [ ] Handle: no location permission, HebCal fetch failure, stale data

## 9. Deployment
- [ ] Push project to GitHub
- [ ] Connect repo to Vercel
- [ ] Configure Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] Configure Supabase auth redirect URLs for Vercel preview + production domains
- [ ] Verify prod deploy: sign up, browse, read, zemanim all working

## 10. Milestone 1 Acceptance Criteria
- [ ] A new user can sign up, sign in, and sign out
- [ ] The full Sefaria table of contents renders as a navigable tree
- [ ] Drilling down works for at least: a Tanakh sefer, a Talmud masekhet, a Mishneh Torah book
- [ ] Clicking a granular unit opens Hebrew + English text inline
- [ ] Zemanim display correct values for the user's location and update on location change
- [ ] App is usable on mobile (responsive)
- [ ] Dark mode default, light mode toggle works
- [ ] Deployed to Vercel with working Supabase auth
