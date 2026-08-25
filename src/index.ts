const VIEWS_PATH = "/api/views";
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

    try {
      if (request.method === "GET") {
        const row = await env.VIEWS_DB.prepare(
          "SELECT value FROM site_stats WHERE key = ?1",
        )
          .bind(TOTAL_VIEWS_KEY)
          .first<{ value: number }>();

        if (!row) {
          throw new Error("Missing total_views row");
        }

        return json({ views: row.value });
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

      return json({ views: row.value });
    } catch {
      return json({ error: "views_unavailable" }, 503);
    }
  },
} satisfies ExportedHandler<Env>;
