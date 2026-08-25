import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("_site");
const failures = [];
let checkCount = 0;

const check = (condition, message) => {
  checkCount += 1;
  if (!condition) failures.push(message);
};

const approvedBio =
  "Hi, I’m David. I’m a software engineering student at the University of Waterloo, learning how modern AI systems work by building smaller versions myself. TalkingML is my public notebook for explanations, experiments, and the occasional wrong turn.";

const elementText = (html, className) => {
  const matches = [
    ...html.matchAll(
      new RegExp(
        `<p[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/p>`,
        "g",
      ),
    ),
  ];

  if (matches.length !== 1) return null;

  return matches[0][1]
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
};

const readOutput = async (file) =>
  readFile(path.join(outputDirectory, file), "utf8");

const [index, about, notFound, feed, sitemap, viewsScript, robots] =
  await Promise.all([
    readOutput("index.html"),
    readOutput("about.html"),
    readOutput("404.html"),
    readOutput("index.xml"),
    readOutput("sitemap.xml"),
    readOutput("scripts/views.js"),
    readOutput("robots.txt"),
  ]);

const wrangler = JSON.parse(await readFile(path.resolve("wrangler.jsonc"), "utf8"));
check(
  wrangler.assets?.html_handling === "auto-trailing-slash",
  "Static Assets HTML handling must serve canonical extensionless URLs",
);
check(
  JSON.stringify(wrangler.assets?.run_worker_first) === JSON.stringify(["/api/*"]),
  "only /api/* should run Worker code before static asset routing",
);

for (const [name, html] of [
  ["homepage", index],
  ["About page", about],
  ["404 page", notFound],
]) {
  check(
    html.includes('<span class="navbar-title">TalkingML</span>'),
    `${name} is missing the TalkingML wordmark`,
  );
  check(
    html.includes("data-total-views"),
    `${name} is missing the site-wide view count`,
  );
  check(
    !html.includes("fonts.googleapis.com"),
    `${name} unexpectedly loads Google Fonts`,
  );
}

for (const label of ["Notes", "About", "GitHub"]) {
  check(
    index.includes(`<span class="menu-text">${label}</span>`),
    `homepage navigation is missing ${label}`,
  );
}

check(
  index.includes('rel="canonical" href="https://talkingml.com/"'),
  "homepage canonical URL is missing or incorrect",
);
check(
  about.includes('rel="canonical" href="https://talkingml.com/about"'),
  "About canonical URL is not extensionless",
);
check(
  index.includes(
    'property="og:image" content="https://talkingml.com/assets/david-avatar.png"',
  ),
  "homepage Open Graph image is missing",
);
check(
  index.includes('alt="Illustrated portrait of David"'),
  "avatar alt text is missing",
);
check(
  elementText(index, "profile-bio") === approvedBio,
  "homepage profile bio does not exactly match the approved copy",
);
check(
  elementText(about, "profile-bio") === approvedBio,
  "About profile bio does not exactly match the approved copy",
);
check(index.includes("data-empty-listing"), "homepage empty state is missing");
check(
  index.includes('data-listing-state="empty"'),
  "homepage listing does not report a genuine empty state",
);
check(
  !index.includes('class="notes-list-item"'),
  "homepage contains a rendered mock article",
);
check(
  about.includes("<h1>Hi, I’m David.</h1>"),
  "About page heading is missing",
);
check(about.includes("Margin note"), "About page editorial sidenote is missing");
check(
  notFound.includes("This page wandered out of the notebook."),
  "custom 404 copy is missing",
);
check(
  notFound.includes('<meta name="robots" content="noindex, nofollow">'),
  "custom 404 page is missing its noindex directive",
);
check(
  !notFound.includes('rel="canonical"'),
  "custom 404 page should not expose a canonical URL",
);

check(feed.includes("<title>TalkingML</title>"), "RSS feed title is missing");
check(
  feed.includes("https://talkingml.com/index.xml"),
  "RSS self link is missing",
);
check(!feed.includes("<item>"), "RSS feed contains a mock article");
check(
  sitemap.includes("<loc>https://talkingml.com/</loc>"),
  "sitemap is missing the canonical homepage URL",
);
check(
  !sitemap.includes("https://talkingml.com/index.html"),
  "sitemap contains a non-canonical homepage alias",
);
check(
  sitemap.includes("https://talkingml.com/about"),
  "sitemap is missing the About page",
);
check(
  !sitemap.includes(".html</loc>"),
  "sitemap contains an HTML URL that Cloudflare would redirect",
);
check(!sitemap.includes("404.html"), "sitemap should not index the 404 page");
check(
  robots.includes("Sitemap: https://talkingml.com/sitemap.xml"),
  "robots.txt is missing the canonical sitemap",
);

check(
  viewsScript.includes('method: "POST"'),
  "view-count client does not increment on page load",
);
check(
  viewsScript.includes("new Intl.NumberFormat()"),
  "view-count client does not format totals with Intl.NumberFormat",
);
check(
  viewsScript.includes('updateViews("Views unavailable", false)'),
  "view-count client is missing its non-blocking fallback",
);
check(
  viewsScript.includes('querySelectorAll("[data-total-views]")'),
  "view-count client does not update every visible counter",
);

const avatar = await readFile(
  path.join(outputDirectory, "assets/david-avatar.png"),
);
const avatarHash = createHash("sha256").update(avatar).digest("hex");
check(
  avatarHash ===
    "265d37b9b935e381b4c4ba048780120421e3403e8f57a3e2812fb07fab0ab701",
  "rendered avatar is not the approved canonical image",
);
check(
  avatar.length >= 24 &&
    avatar.subarray(1, 4).toString("ascii") === "PNG" &&
    avatar.readUInt32BE(16) === 1254 &&
    avatar.readUInt32BE(20) === 1254,
  "rendered avatar does not have the expected 1254 by 1254 PNG dimensions",
);

const bootstrapDirectory = path.join(outputDirectory, "site_libs/bootstrap");
const bootstrapFiles = await readdir(bootstrapDirectory);
const compiledCss = (
  await Promise.all(
    bootstrapFiles
      .filter((file) => file.endsWith(".css"))
      .map((file) => readFile(path.join(bootstrapDirectory, file), "utf8")),
  )
).join("\n");
check(
  !compiledCss.includes("fonts.googleapis.com") &&
    !compiledCss.includes("fonts.gstatic.com"),
  "compiled styles contain an external font dependency",
);

const topLevelFiles = await readdir(outputDirectory);
const htmlFiles = topLevelFiles
  .filter((file) => file.endsWith(".html"))
  .sort();
check(
  JSON.stringify(htmlFiles) ===
    JSON.stringify(["404.html", "about.html", "index.html"]),
  `unexpected generated HTML pages: ${htmlFiles.join(", ")}`,
);

for (const [name, html] of [
  ["homepage", index],
  ["About page", about],
  ["404 page", notFound],
]) {
  check(
    !/href="\/(?!\/)[^"#?]*\.html(?:[?#][^"]*)?"/.test(html),
    `${name} contains an internal .html link that Cloudflare would redirect`,
  );
  check(
    !/https:\/\/talkingml\.com\/[^"<]*\.html/.test(html),
    `${name} contains a canonical .html URL that Cloudflare would redirect`,
  );
  check(
    !/(?:href|src)="(?:\/\.(?:\/|\")|\.\/\/)/.test(html),
    `${name} contains an unnormalized root-relative path`,
  );
}

const findForbiddenOutput = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === ".wrangler"
    ) {
      return path.relative(outputDirectory, entryPath);
    }

    if (entry.isDirectory()) {
      const nested = await findForbiddenOutput(entryPath);
      if (nested) return nested;
    }
  }

  return null;
};

const forbiddenOutput = await findForbiddenOutput(outputDirectory);
check(
  forbiddenOutput === null,
  `generated site contains a development-only directory: ${forbiddenOutput}`,
);

if (failures.length > 0) {
  for (const failure of failures) console.error(`- ${failure}`);
  throw new Error(
    `${failures.length} of ${checkCount} generated-site checks failed`,
  );
}

console.log(`Generated site validation passed (${checkCount} checks).`);
