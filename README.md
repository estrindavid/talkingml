# TalkingML

TalkingML is David's public notebook for explanations, experiments, and the occasional wrong turn while learning how modern AI systems work.

This repository contains the **foundation only**: the Editorial Margin Quarto site, a locally tested Cloudflare Worker, and a D1-backed total-view counter. It is not deployed, no production D1 database exists, and `talkingml.com` has not been attached.

## Stack

- [Quarto 1.10.18](https://quarto.org/) for the static site and article pipeline.
- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) for eventual hosting.
- [Cloudflare D1](https://developers.cloudflare.com/d1/) for the lightweight public total-view counter.
- TypeScript and Vitest running inside Cloudflare's local Workers runtime.

All project dependencies are pinned in `package-lock.json`. The design uses system serif and sans-serif stacks, so it downloads no external fonts.

## Local development

Requirements: Node.js 24 or newer and Quarto 1.10.18.

```bash
npm install
npm run types
npm test
npm run build
npm run validate:site
```

To run the complete local Worker, static site, and local D1 counter:

```bash
npm run build
npm run db:migrate:local
npm run dev
```

Wrangler uses local state by default. Do not add `--remote` or set a remote D1 binding during the foundation phase.

## View counter contract

- `GET /api/views` reads the current total without incrementing it.
- `POST /api/views` atomically increments the total and returns the new value.
- Every browser page load sends one `POST`; reloads and navigation count again.
- Explicit cross-origin `POST` requests are rejected.
- Responses are never cached. D1 failures return `503 {"error":"views_unavailable"}`, and the page displays `Views unavailable` without blocking content.

The public number is deliberately labeled **total views**, not people or unique visitors. Cloudflare Web Analytics is deferred as the private, more trustworthy source for traffic and performance reporting.

## The $0 boundary

This project is designed to stay inside free plans:

- Static Asset requests are free and unlimited.
- Workers Free currently allows 100,000 dynamic requests per day.
- D1 Free currently allows 100,000 row writes per day; one page view creates one write.
- Standard GitHub-hosted Actions are free for public repositories.

CI uses a standard runner and stores no artifacts or caches. Free-plan limits can change, so they must be rechecked before launch. The repository intentionally contains no deploy workflow, Cloudflare secret, route, custom domain, remote database ID, or analytics configuration. Domain registration and renewal are separate from hosting and are not made free by this stack.

See [the launch gate](docs/launch-gate.md) before creating any remote resource.

## Commands

| Command | Purpose |
| --- | --- |
| `npm test` | Run the Worker API against isolated local D1. |
| `npm run typecheck` | Type-check the Worker, configuration, and tests. |
| `npm run build` | Render the complete Quarto site into `_site`. |
| `npm run validate:site` | Check navigation, metadata, feed, sitemap, avatar, and empty state. |
| `npm run deploy:dry-run` | Compile the Worker bundle without deploying it. |
| `npm run check` | Run all foundation checks in CI order. |
