# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Le Ré-seau — a local community social network for Île de Ré (France). This is a v3 rewrite (React + Vite + TypeScript + Supabase) that fixes bugs from a v2 and adds previously-missing pages. It is explicitly **not** a dating app — it's for making friends, meeting up, organizing local activities, and helping neighbors (see `/terms`, `/community-rules`, `/about`).

## Commands

```bash
npm run dev          # start dev server on port 8080 (Vite)
npm run build        # production build
npm run build:dev    # build in development mode
npm run lint         # eslint .
npm run test         # vitest run (single run)
npm run test:watch   # vitest watch mode
```

There is no root ESLint config file checked in (`eslint.config.js` is absent despite the `lint` script and `eslint`/`typescript-eslint` devDependencies) — `npm run lint` may need a config added before it works. No test files currently exist in `src/`, even though Vitest + Testing Library are fully configured as devDependencies.

Local dev requires a `.env` (copy from `.env.example`) with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` pointing at a Supabase project that has run `supabase/migrations/001_init.sql` then `002_unread_messages.sql`.

## Architecture

**Stack**: React 18 + Vite (SWC plugin) + TypeScript + Tailwind + shadcn/ui (Radix primitives in `src/components/ui/`) + React Router + Supabase (auth, Postgres, Realtime, Storage). Path alias `@/*` → `src/*`.

**Routing**: single `<Routes>` table in `src/App.tsx`. One page per route in `src/pages/`, plus a persistent `BottomNav`. `App.tsx` also gates the whole app: if a signed-in user's profile has `is_banned = true`, every route except `ALWAYS_ACCESSIBLE` (home, about, auth, community-rules, privacy, terms, legal-notice) renders `BannedScreen` instead of the real page.

**Auth**: `src/lib/auth-context.tsx` wraps the app in an `AuthProvider` exposing `{ user, session, loading, isAdmin, isBanned, signOut }` via `useAuth()`. It listens to `supabase.auth.onAuthStateChange` and separately queries `profiles.is_admin` / `profiles.is_banned` whenever the user changes. Google OAuth errors (e.g. user clicks "Deny") come back as query/hash params on `/auth` and must be parsed manually — see the `useEffect` in `Auth.tsx` handling `error=access_denied`.

**Supabase integration**: `src/integrations/supabase/client.ts` creates the typed client from `./types` (generated `Database` type). All tables use Postgres Row Level Security — the standing rule is a user can only mutate their own rows (`author_id = auth.uid()` / `user_id = auth.uid()` policies), enforced in `supabase/migrations/001_init.sql`. Any new table needs equivalent RLS policies, not app-level checks alone.

**Data model** (`supabase/migrations/001_init.sql`): `profiles`, `messages` (1:1 chat), `chat_groups`/`chat_group_members`/`chat_group_messages`, `salon_messages` (persistent public chat rooms), `forum_posts`/`forum_likes`/`forum_comments`, `job_offers`/`job_requests`, `activities`/`activity_participants`, plus a `reports` table used by the moderation flow. A `site_stats` SQL view backs the real member-count shown on the homepage (previously hardcoded in v2).

**Realtime notifications**: `src/lib/useGlobalMessageNotifications.ts` subscribes to a per-user Supabase Realtime channel filtered on `messages` inserts where `receiver_id = user.id`, and pops a toast (via `sonner`) unless the user is already viewing that chat thread. This hook is invoked once, globally, in `AppRoutes`. Separately, `src/lib/push-notifications.ts` + `public/sw.js` + `public/manifest.json` implement browser push notifications (PWA) — this is a distinct mechanism from the in-app Realtime toast.

**Moderation**: reports are created against arbitrary content types (`profile`, `message`, `group_message`, `salon_message`, `forum_post`, `forum_comment`, `job_offer`, `job_request`, `activity`) and reviewed in `src/pages/Admin.tsx`, gated on `isAdmin` from the auth context. Admins can dismiss a report or ban the target user (`is_banned`), which is what `BannedScreen` in `App.tsx` reacts to.

**Legal/compliance pages**: `/privacy`, `/terms`, `/community-rules`, `/legal-notice` are real content (not placeholders) and are kept deliberately in sync — e.g. minimum signup age (`MIN_AGE` in `src/lib/constants.ts`) must match the age stated in `TermsOfService.tsx`, and the DB check constraint on `profiles.age` in `001_init.sql`. Signup (`Auth.tsx`) requires checking a consent checkbox linking to `/terms` and `/privacy` before submitting.

**Maps**: Leaflet/`react-leaflet` powered location picking (`LocationPicker.tsx`, `MapLocationPicker.tsx`) and a full map view (`MapView.tsx`), each wrapped in `ErrorBoundary` since Leaflet can throw during mount in some environments — always keep that wrapper when touching map components.

**Photos/storage**: profile and activity photos go to two public-read Supabase Storage buckets; write access is restricted to the owner's own folder path via storage policies (not just app logic).
