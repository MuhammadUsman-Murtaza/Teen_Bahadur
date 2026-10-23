# Teen_Bahadur

This repo now includes a small mobile-style web UI for the NEDUET shuttle routes, plus the
original markdown data files the app is based on.

## What was added

- `data/shuttle_service.md` — raw text taken from the official shuttle routes PDF.
- `data/NEDUET_Shuttle_Points_and_Routes.md` — cleaned, structured markdown version of the routes.
- A Vite + React app under `src/` that renders a mobile-like shuttle routes screen.

The UI is intentionally simple: it just shows a list of morning shuttle routes using data
derived from the markdown file, so you can preview how the mobile app could look.

## Running the mobile-style UI locally

```bash
npm install
npm run dev
```

Then open the printed URL (usually http://localhost:5173) in your browser or a mobile
simulator.

## Supabase (database + auth)

This project is prepared to talk to Supabase, but **does not require it yet**. To wire it up
later:

1. Create a Supabase project.
2. Copy the project URL and anon key.
3. In this workspace's **Secrets** panel, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Restart `npm run dev` so Vite picks up the new env vars.

The helper in `src/lib/supabaseClient.ts` reads those values and creates a shared Supabase
client instance. UI components can import `getSupabaseClient()` when you are ready to build
real database queries and authentication flows.

All data in the current UI is static/in-memory, so nothing is persisted yet.