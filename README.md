<p align="center">
  <img src="docs/logo.svg" alt="Rupa logo" width="96" height="96" />
</p>

<h1 align="center">Rupa</h1>

<p align="center">
  A self-hostable, Canva-style design editor for the browser.<br />
  Drag-and-drop canvas, templates, slides with page transitions, and export to PNG, JPG or PDF.
</p>

<p align="center">
  <img alt="SvelteKit" src="https://img.shields.io/badge/SvelteKit-FF3E00?logo=svelte&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="Postgres" src="https://img.shields.io/badge/Postgres-4169E1?logo=postgresql&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" />
</p>

## About

Rupa is a self-hostable, Canva-style design editor built with SvelteKit (Svelte 5) and Konva.

- **Editor:** text with 1,500+ web fonts and effects, shapes, lines, icons (Iconify), photos with filters, cropping, rounded corners and borders, snapping guides, multi-select, group/ungroup, align/distribute, layers, lock, copy/paste, undo/redo, keyboard shortcuts, right-click menu.
- **Pages & presenting:** multi-page designs, slide filmstrip and page grid view, fullscreen present mode, resize to other formats.
- **Page transitions:** per-slide fade, slide, circle/color/line wipe, flow and stack transitions with adjustable duration and direction, played in present mode.
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

## Contents

[Stack](#stack) · [Local development](#local-development) · [Self-hosting](#self-hosting) · [Configuration](#configuration) · [Project layout](#project-layout)

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
  canvas/      Konva renderer, page canvas, text editing, crop, export, page transitions
  ui/          shell, toolbars, side panels, dialogs
src/lib/server/  db, auth, storage, stock photos, design persistence
src/routes/      dashboard, login, editor, present, JSON API
scripts/         seed + starter templates
docs/            README assets (logo)
e2e/             Playwright tests
```
