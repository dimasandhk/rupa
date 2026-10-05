# Dimva

A self-hostable, Canva-style design editor built with SvelteKit (Svelte 5) and Konva.

- **Editor:** text with 1,500+ web fonts and effects, shapes, lines, icons (Iconify), photos with filters, cropping, rounded corners and borders, snapping guides, multi-select, group/ungroup, align/distribute, layers, lock, copy/paste, undo/redo, keyboard shortcuts, right-click menu.
- **Pages & presenting:** multi-page designs, page grid view, fullscreen present mode, resize to other formats.
- **Assets:** starter templates, uploads, stock photos (Unsplash or Pexels with an API key, Wikimedia Commons without one).
- **Export:** PNG (optionally transparent), JPG, multi-page PDF, or a zip of PNGs.
- **AI background remover:** runs free in the browser by default; can use fal.ai instead.
- **Accounts & autosave:** email/password login, designs saved automatically, with conflict detection across tabs.

## Stack

|        |                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------ |
| App    | SvelteKit 3, Svelte 5 runes, TypeScript, Tailwind v4, bits-ui                                    |
| Canvas | Konva, driven by a JSON document model (`src/lib/editor/model`) with patch-based undo (mutative) |
| Data   | Postgres + Drizzle ORM, Better Auth                                                              |
| Files  | Any S3-compatible storage (RustFS locally), served through the app at `/files/*`                 |
| Deploy | Docker image + Caddy reverse proxy (automatic HTTPS)                                             |

## Local development

Requires Node 24, pnpm 10 and Docker.

```sh
cp .env.example .env               # then set BETTER_AUTH_SECRET (any long random string)
pnpm install
pnpm db:start                      # postgres (port 5433) + RustFS (9000, console on 9001)
pnpm db:migrate
pnpm dev                           # http://localhost:5173
pnpm db:seed --dev-user            # starter templates + a dev login (see scripts/seed.ts); needs the dev server running
```

Tests:

```sh
pnpm test:unit -- --run            # document model, commands, history
pnpm test:e2e                      # Playwright: editing, autosave, pages, present, templates, export, crop
pnpm check                         # svelte-check / TypeScript
```

## Self-hosting

```sh
cp .env.example .env               # set BETTER_AUTH_SECRET; optionally API keys
APP_URL=https://design.example.com docker compose --profile app up -d --build   # migrations run on start
```

- Without `APP_URL` the stack serves `http://localhost:3000`. With a real domain, Caddy gets a TLS certificate automatically (ports 80/443 must be reachable).
- Seed templates against the running stack with `DATABASE_URL=postgres://root:mysecretpassword@localhost:5433/local pnpm db:seed`.
- To use external S3/R2 instead of the bundled RustFS, set the `S3_*` variables in `.env` (and optionally `S3_PUBLIC_URL` to serve files from a CDN).
- Change the default Postgres/RustFS passwords in `compose.yaml` before exposing a server.

## Configuration

See `.env.example`. Optional keys:

- `UNSPLASH_ACCESS_KEY` / `PEXELS_API_KEY`: better stock photo search.
- `PUBLIC_BG_REMOVAL_PROVIDER=api` + `FAL_KEY`: background removal via fal.ai instead of in the browser.

## License note

The in-browser background remover uses `@imgly/background-removal`, which is **AGPL-3.0**. That's fine for personal or open-source use. For a closed-source commercial deployment, swap the implementation in `src/lib/ai/bg-removal.ts` (e.g. transformers.js with an MIT-licensed model) or use the fal.ai provider.

## Project layout

```
src/lib/editor/
  model/       document types, zod schema, factories, geometry
  commands/    pure editing operations (align, group, pages, resize) — unit tested
  state/       Editor store (undo/redo, selection), autosave
  canvas/      Konva renderer, page canvas, text editing, crop, export
  ui/          shell, toolbars, side panels, dialogs
src/lib/server/  db, auth, storage, stock photos, design persistence
src/routes/      dashboard, login, editor, present, JSON API
scripts/         seed + starter templates
e2e/             Playwright tests
```
