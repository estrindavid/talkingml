import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("static asset fallback", () => {
  it("serves the rendered homepage when a non-API request reaches the Worker", async () => {
    const response = await exports.default.fetch(
      new Request("https://talkingml.com/"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    await expect(response.text()).resolves.toContain("TalkingML");
  });

  it("serves the custom HTML 404 for a missing navigation request", async () => {
    const response = await exports.default.fetch(
      new Request("https://talkingml.com/missing-page", {
        headers: {
          Accept: "text/html",
          "Sec-Fetch-Mode": "navigate",
        },
      }),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("text/html");
    await expect(response.text()).resolves.toContain(
      "This page wandered out of the notebook.",
    );
  });

  it("keeps nested 404 dependencies rooted at the site origin", async () => {
    for (const pathname of ["/missing/child", "/missing/"]) {
      const response = await exports.default.fetch(
        new Request(`https://talkingml.com${pathname}`, {
          headers: {
            Accept: "text/html",
            "Sec-Fetch-Mode": "navigate",
          },
        }),
      );
      const html = await response.text();

      expect(response.status).toBe(404);
      expect(html).toContain('src="/site_libs/');
      expect(html).toContain('src="/scripts/views.js"');
      expect(html).toContain('src="/scripts/reading-progress.js"');
      expect(html).not.toMatch(
        /(?:src|href)="(?:\.\/)?(?:site_libs|assets|scripts)\//,
      );
    }

    const script = await exports.default.fetch(
      new Request("https://talkingml.com/scripts/views.js"),
    );
    expect(script.status).toBe(200);

    const progressScript = await exports.default.fetch(
      new Request("https://talkingml.com/scripts/reading-progress.js"),
    );
    expect(progressScript.status).toBe(200);
  });

  it("serves Quarto pages at their canonical extensionless URLs", async () => {
    const response = await exports.default.fetch(
      new Request("https://talkingml.com/about"),
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain("Hi, I’m David.");
  });
});
