import { env, exports } from "cloudflare:workers";
import { expect, it } from "vitest";

it("returns a stable 503 for GET and POST when D1 is unavailable", async () => {
  await env.VIEWS_DB.prepare("DROP TABLE site_stats").run();

  for (const method of ["GET", "POST"]) {
    const response = await exports.default.fetch(
      new Request(
        "https://talkingml.com/api/views?path=%2Fposts%2Fwhat-is-talkingml%2F",
        { method },
      ),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "views_unavailable",
    });
  }
});
