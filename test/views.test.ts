import { env, exports } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

const endpoint =
  "https://talkingml.com/api/views?path=%2Fposts%2Fwhat-is-talkingml%2F";

beforeEach(async () => {
  await env.VIEWS_DB.batch([
    env.VIEWS_DB.prepare("DELETE FROM site_stats WHERE key LIKE ?1").bind(
      "page:%",
    ),
    env.VIEWS_DB.prepare(
      "UPDATE site_stats SET value = 0 WHERE key = 'total_views'",
    ),
  ]);
});

describe("views API", () => {
  it("returns the current article total without incrementing it", async () => {
    const response = await exports.default.fetch(new Request(endpoint));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ views: 0 });
  });

  it("increments once for every article POST and returns the new total", async () => {
    const first = await exports.default.fetch(
      new Request(endpoint, { method: "POST" }),
    );
    const second = await exports.default.fetch(
      new Request(endpoint, { method: "POST" }),
    );
    const current = await exports.default.fetch(new Request(endpoint));

    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toEqual({
      views: 1,
      totalViews: 1,
    });
    await expect(second.json()).resolves.toEqual({
      views: 2,
      totalViews: 2,
    });
    await expect(current.json()).resolves.toEqual({ views: 2 });
  });

  it("increments and reads the overall site total without an article path", async () => {
    const siteEndpoint = "https://talkingml.com/api/views";
    const first = await exports.default.fetch(
      new Request(siteEndpoint, { method: "POST" }),
    );
    const second = await exports.default.fetch(
      new Request(siteEndpoint, { method: "POST" }),
    );
    const current = await exports.default.fetch(new Request(siteEndpoint));

    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toEqual({ totalViews: 1 });
    await expect(second.json()).resolves.toEqual({ totalViews: 2 });
    await expect(current.json()).resolves.toEqual({ totalViews: 2 });
  });

  it("increments both totals atomically for an article page view", async () => {
    const article = await exports.default.fetch(
      new Request(endpoint, { method: "POST" }),
    );
    const site = await exports.default.fetch(
      new Request("https://talkingml.com/api/views"),
    );

    await expect(article.json()).resolves.toEqual({
      views: 1,
      totalViews: 1,
    });
    await expect(site.json()).resolves.toEqual({ totalViews: 1 });
  });

  it("keeps different article counters independent", async () => {
    const otherEndpoint =
      "https://talkingml.com/api/views?path=%2Fposts%2Fsecond-note%2F";

    await exports.default.fetch(new Request(endpoint, { method: "POST" }));
    await exports.default.fetch(new Request(otherEndpoint, { method: "POST" }));
    await exports.default.fetch(new Request(otherEndpoint, { method: "POST" }));

    const article = await exports.default.fetch(new Request(endpoint));
    const otherArticle = await exports.default.fetch(new Request(otherEndpoint));

    await expect(article.json()).resolves.toEqual({ views: 1 });
    await expect(otherArticle.json()).resolves.toEqual({ views: 2 });
  });

  it("does not lose increments when POST requests arrive concurrently", async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        exports.default.fetch(new Request(endpoint, { method: "POST" })),
      ),
    );
    const values = await Promise.all(
      responses.map(async (response) => {
        const body = await response.json<{ views: number }>();
        return body.views;
      }),
    );

    expect([...values].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("rejects an explicit cross-origin POST", async () => {
    const response = await exports.default.fetch(
      new Request(endpoint, {
        method: "POST",
        headers: { Origin: "https://example.com" },
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "cross_origin_forbidden",
    });
  });

  it("rejects requests without a valid article path", async () => {
    for (const path of ["", "%2F", "%2Fabout", "%2Fposts%2F..%2Fsecret%2F"]) {
      const response = await exports.default.fetch(
        new Request(`https://talkingml.com/api/views?path=${path}`),
      );

      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toBe("no-store");
      await expect(response.json()).resolves.toEqual({
        error: "invalid_article_path",
      });
    }
  });

  it("allows a same-origin POST", async () => {
    const response = await exports.default.fetch(
      new Request(endpoint, {
        method: "POST",
        headers: { Origin: "https://talkingml.com" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      views: 1,
      totalViews: 1,
    });
  });

  it("returns 405 and an Allow header for unsupported methods", async () => {
    const response = await exports.default.fetch(
      new Request(endpoint, { method: "PUT" }),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, POST");
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "method_not_allowed",
    });
  });
});
