import { env, exports } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

const endpoint = "https://talkingml.com/api/views";

beforeEach(async () => {
  await env.VIEWS_DB.prepare(
    "UPDATE site_stats SET value = 0, updated_at = CURRENT_TIMESTAMP WHERE key = ?1",
  )
    .bind("total_views")
    .run();
});

describe("views API", () => {
  it("returns the current total without incrementing it", async () => {
    const response = await exports.default.fetch(new Request(endpoint));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ views: 0 });
  });

  it("increments once for every POST and returns the new total", async () => {
    const first = await exports.default.fetch(
      new Request(endpoint, { method: "POST" }),
    );
    const second = await exports.default.fetch(
      new Request(endpoint, { method: "POST" }),
    );
    const current = await exports.default.fetch(new Request(endpoint));

    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toEqual({ views: 1 });
    await expect(second.json()).resolves.toEqual({ views: 2 });
    await expect(current.json()).resolves.toEqual({ views: 2 });
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

  it("allows a same-origin POST", async () => {
    const response = await exports.default.fetch(
      new Request(endpoint, {
        method: "POST",
        headers: { Origin: "https://talkingml.com" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ views: 1 });
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
