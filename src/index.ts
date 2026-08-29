const VIEWS_PATH = "/api/views";
const ARTICLE_VIEW_KEY_PREFIX = "page:";
const TOTAL_VIEWS_KEY = "total_views";

function json(
  body: unknown,
  status = 200,
  additionalHeaders?: HeadersInit,
): Response {
  const headers = new Headers(additionalHeaders);
  headers.set("Cache-Control", "no-store");

  return Response.json(body, {
    status,
    headers,
  });
}

function isExplicitlyCrossOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");

  if (!origin) {
    return false;
  }

  try {
    return new URL(origin).origin !== new URL(request.url).origin;
  } catch {
    return true;
  }
}

function articlePathFor(url: URL): string | null {
  const path = url.searchParams.get("path");

  if (
    !path ||
    !path.startsWith("/posts/") ||
    !path.endsWith("/") ||
    path.includes("//") ||
    path.includes("..")
  ) {
    return null;
  }

  try {
    const parsed = new URL(path, url.origin);
    if (parsed.origin !== url.origin || parsed.pathname !== path) {
      return null;
    }
  } catch {
    return null;
  }

  return path;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== VIEWS_PATH) {
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
        return json({ error: "not_found" }, 404);
      }

      return env.ASSETS.fetch(request);
    }

    if (request.method !== "GET" && request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405, {
        Allow: "GET, POST",
      });
    }

    if (request.method === "POST" && isExplicitlyCrossOrigin(request)) {
      return json({ error: "cross_origin_forbidden" }, 403);
    }

    const hasArticlePath = url.searchParams.has("path");
    const articlePath = articlePathFor(url);

    if (hasArticlePath && !articlePath) {
      return json({ error: "invalid_article_path" }, 400);
    }

    try {
      if (!articlePath) {
        if (request.method === "GET") {
          const row = await env.VIEWS_DB.prepare(
            "SELECT value FROM site_stats WHERE key = ?1",
          )
            .bind(TOTAL_VIEWS_KEY)
            .first<{ value: number }>();

          return json({ totalViews: row?.value ?? 0 });
        }

        const [, result] = await env.VIEWS_DB.batch<{ value: number }>([
          env.VIEWS_DB.prepare(
            `UPDATE site_stats
             SET value = value + 1, updated_at = CURRENT_TIMESTAMP
             WHERE key = ?1`,
          ).bind(TOTAL_VIEWS_KEY),
          env.VIEWS_DB.prepare(
            "SELECT value FROM site_stats WHERE key = ?1",
          ).bind(TOTAL_VIEWS_KEY),
        ]);
        const row = result.results[0];

        if (!row) {
          throw new Error("Missing total_views row");
        }

        return json({ totalViews: row.value });
      }

      const articleKey = `${ARTICLE_VIEW_KEY_PREFIX}${articlePath}`;

      if (request.method === "GET") {
        const row = await env.VIEWS_DB.prepare(
          "SELECT value FROM site_stats WHERE key = ?1",
        )
          .bind(articleKey)
          .first<{ value: number }>();

        return json({ views: row?.value ?? 0 });
      }

      const [, , , articleResult, totalResult] =
        await env.VIEWS_DB.batch<{ value: number }>([
        env.VIEWS_DB.prepare(
          `INSERT OR IGNORE INTO site_stats (key, value, updated_at)
           VALUES (?1, 0, CURRENT_TIMESTAMP)`,
        ).bind(articleKey),
        env.VIEWS_DB.prepare(
          `UPDATE site_stats
           SET value = value + 1, updated_at = CURRENT_TIMESTAMP
           WHERE key = ?1`,
        ).bind(articleKey),
        env.VIEWS_DB.prepare(
          `UPDATE site_stats
           SET value = value + 1, updated_at = CURRENT_TIMESTAMP
           WHERE key = ?1`,
        ).bind(TOTAL_VIEWS_KEY),
        env.VIEWS_DB.prepare(
          "SELECT value FROM site_stats WHERE key = ?1",
        ).bind(articleKey),
        env.VIEWS_DB.prepare(
          "SELECT value FROM site_stats WHERE key = ?1",
        ).bind(TOTAL_VIEWS_KEY),
      ]);

      const articleRow = articleResult.results[0];
      const totalRow = totalResult.results[0];

      if (!articleRow || !totalRow) {
        throw new Error("Missing views row");
      }

      return json({
        views: articleRow.value,
        totalViews: totalRow.value,
      });
    } catch {
      return json({ error: "views_unavailable" }, 503);
    }
  },
} satisfies ExportedHandler<Env>;
