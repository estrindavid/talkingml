# Deferred launch gate

Nothing in this repository authorizes a production deployment. Before TalkingML goes live:

1. Write and approve the first genuine article; do not replace the current empty state with filler.
2. Design the article creation and editing workflow as its own phase.
3. Recheck Cloudflare and GitHub free-plan limits, and confirm the account remains on Workers Free.
4. Create the production D1 database in Eastern North America and apply `migrations/0001_site_stats.sql`.
5. Replace the all-zero local database ID with the real production binding through an explicitly approved configuration change.
6. Create scoped deployment credentials and GitHub secrets.
7. Add an explicitly approved deployment workflow using Cloudflare's official GitHub Actions guidance.
8. Deploy and verify the Worker before attaching a hostname.
9. Attach `talkingml.com` as the canonical custom domain and redirect `www.talkingml.com` to the apex.
10. Enable free Cloudflare Web Analytics, verify canonical metadata, robots, RSS, and sitemap, then allow indexing.

Never run `wrangler deploy`, `wrangler d1 create`, or a domain/DNS mutation as part of foundation verification. `wrangler deploy --dry-run` is the only deployment command currently permitted.
