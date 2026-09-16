# Rhapsody — pre-launch landing page

Single-route "coming soon" page announcing public reveal on **5 October 2026**
and capturing a private-list email signup. Next.js 16 (App Router) + Tailwind
v4 + shadcn, built around two 21st.dev registry components (`coming-soon-3`,
`milky-way`) recolored to brand tokens — see `NOTES_components.md` for the
full inventory of what was changed and why.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Build / verify

```bash
npm run lint
npm run build
npm run start   # production server, for Lighthouse / real perf numbers
```

## Environment variables

None are required to run the page — the email capture works out of the box,
appending to `data/subscribers.jsonl` (gitignored). To also relay each
signup to a real inbox, set:

| Var | Value |
|---|---|
| `SUBSCRIBE_PROVIDER` | `resend` (only provider wired up so far) |
| `SUBSCRIBE_API_KEY` | Resend API key |
| `SUBSCRIBE_LIST_ID` | reserved for a future audience/list integration — not yet used |

When `SUBSCRIBE_PROVIDER=resend` and `SUBSCRIBE_API_KEY` are set, `/api/subscribe`
also sends a notification to `RSVP_NOTIFY_EMAIL` (`src/config/brand.ts`,
currently `ProjectRhapsodyRSVP@theconcretegrp.com`). The JSONL append always
happens regardless — it's the durable record.

## Deploy

**Production (Vercel or any Node host):** this is a normal Next.js app —
`vercel deploy`, or `npm run build && npm run start` behind any Node
process manager. The `/api/subscribe` route needs a Node runtime.

**External review (GitHub Pages):** `.github/workflows/deploy-pages.yml`
builds a **static-export copy** on every push to `main` and deploys it to
GitHub Pages. GitHub Pages can't run the `/api/subscribe` route handler (no
Node server), so the workflow strips `src/app/api` before building — that
only affects the CI checkout, not the tracked source. On the Pages copy the
email form will show its error state on submit; everything else (theme
toggle, countdown, milky-way background, responsive layout) works
identically. Enable it once under **Settings → Pages → Source: GitHub
Actions**.

## Known deviations from spec

See `NOTES_components.md` for the two documented cases where the brief's
exact wording ("≤8px" parallax, "3–5% of particles") doesn't map cleanly
onto the `milky-way` component's actual (3D-radian, continuous-shader)
parameterization, and the closest-equivalent choice made instead.
