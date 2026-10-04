# Deployment

Step-by-step with screenshots-level detail: [`deploy/STEP_BY_STEP_GUIDE.md`](../deploy/STEP_BY_STEP_GUIDE.md). This page is the checklist/reference.

## Topology
- **Supabase** – Postgres + Realtime (run `deploy/supabase_schema.sql`).
- **Client app** – Vercel/Netlify project, root directory `client`.
- **Business app** – second project, root directory `business`.
- The legacy `server/` is **not deployed** in this setup.

## Environment matrix
| Project | Variables |
|---|---|
| client | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| business | same two + `VITE_OPERATOR_USER`, `VITE_OPERATOR_PASS` |

Vite inlines these at **build time**; redeploy after changing them.

## SPA routing
`client/public/_redirects` and `business/public/_redirects` handle Netlify. Vercel needs no config for hash-less single-page apps in this project (no client-side routes beyond `/`).

## Pre-deploy checklist
- [ ] `deploy/check_ready.bat` passes (both builds)
- [ ] `npm run lint` clean in both apps
- [ ] Operator password changed from default
- [ ] RLS policies tightened if real customers will use it ([SECURITY.md](SECURITY.md))
- [ ] Seed data replaced with real pools/vehicles/prices
- [ ] Supabase project region = Singapore; consider Pro tier (free projects pause after inactivity)

## Post-deploy verification
1. Business app shows the login gate; log in.
2. Top bar shows live connection.
3. Book a ticket from the client app on a phone → operator hears the voice alert within ~1 s.
4. Mark paid / check in / cancel; verify timeline entries and seat release.
5. Supabase Table Editor → `bookings` shows the row.

## Updating the database
There are no migrations. For schema changes on a live project, write a manual `ALTER TABLE` script, test on a copy, and also update `supabase_schema.sql`. Back up via Supabase dashboard before changes.

## Known deployment issues
- `deploy/env_templates/{backend,client,business}.env.example` refer to the old Render/Zeabur setup; use `supabase.env.example`.
- Free Supabase projects pause after ~1 week of inactivity — first visit afterwards will fail until resumed.
- `.url` shortcuts and `start_all.bat` are local-dev conveniences only.
