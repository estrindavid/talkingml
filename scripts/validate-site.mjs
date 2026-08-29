import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("_site");
const failures = [];
let checkCount = 0;

const sourceStyles = await readFile(path.resolve("styles.scss"), "utf8");

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

const sourcePostEntries = await readdir(path.resolve("posts"), {
  withFileTypes: true,
});
const hasSourcePosts = sourcePostEntries.some((entry) => entry.isDirectory());

const [index, about, progress, interviews, notFound, firstArticle, feed, sitemap, viewsScript, progressScript, robots] =
  await Promise.all([
    readOutput("index.html"),
    readOutput("about.html"),
    readOutput("progress.html").catch(() => ""),
    readOutput("interviews.html").catch(() => ""),
    readOutput("404.html"),
    readOutput("posts/what-is-talkingml/index.html"),
    readOutput("index.xml"),
    readOutput("sitemap.xml"),
    readOutput("scripts/views.js"),
    readOutput("scripts/reading-progress.js").catch(() => ""),
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
  ["Progress page", progress],
  ["Interviews page", interviews],
  ["404 page", notFound],
]) {
  check(
    html.includes('<span class="navbar-title">TalkingML</span>'),
    `${name} is missing the TalkingML wordmark`,
  );
  check(
    !html.includes("data-total-views") && !html.includes("footer-view-count"),
    `${name} still renders the removed site-wide view count`,
  );
  check(
    !html.includes("Views unavailable"),
    `${name} exposes the view-count failure text`,
  );
  check(
    !html.includes("fonts.googleapis.com"),
    `${name} unexpectedly loads Google Fonts`,
  );
}

for (const label of ["Progress", "Interviews", "About"]) {
  check(
    index.includes(`<span class="menu-text">${label}</span>`),
    `homepage navigation is missing ${label}`,
  );
}

check(
  !index.includes("The person in the margin"),
  "homepage still uses the rejected profile kicker",
);
check(
  !index.includes("A public learning notebook"),
  "homepage still uses the rejected notebook kicker",
);
check(
  !index.includes('class="field-signal"') && !index.includes("TML / FIELD 01"),
  "homepage still renders the rejected field-signal decoration",
);
check(
  index.includes("Let’s learn about AI together."),
  "homepage is missing the approved AI-together heading",
);
check(
  index.includes("data-site-view-count"),
  "homepage profile is missing the overall view count",
);
check(
  index.includes("data-site-views-label"),
  "homepage overall view count cannot render a singular label",
);
check(
  index.includes('<span data-site-views-label="">views</span>'),
  "homepage profile view count still includes the overall qualifier",
);
check(
  index.includes("data-home-article-view-count") &&
    index.includes('data-article-path="/posts/what-is-talkingml/"'),
  "homepage expanded article is missing its article-specific view count",
);
check(
  elementText(index, "notes-intro") ===
    "A UWaterloo software engineering student’s blog.",
  "homepage is missing the approved UWaterloo subtitle",
);
check(
  !index.includes("Software engineering student · Waterloo"),
  "homepage still renders the removed profile role",
);
check(
  index.includes('href="https://www.youtube.com/@DavidEstrine/videos"') &&
    index.includes("David on YouTube"),
  "homepage profile is missing David's YouTube link",
);
for (const [name, html] of [
  ["homepage", index],
  ["About page", about],
]) {
  check(
    html.includes('href="https://x.com/DavidEstrine"') &&
      !html.includes('href="https://x.com/estrindavid"'),
    `${name} X link does not point to DavidEstrine`,
  );
}
check(
  index.includes('href="https://cal.com/david-estrine-xsm6wb"') &&
    index.includes("Book a chat"),
  "homepage profile is missing the calendar booking link",
);
check(
  !index.includes("YouTube <small>soon</small>") &&
    !index.includes("Calendar <small>soon</small>"),
  "homepage profile still renders pending social links",
);
for (const section of ["progress-lane", "interviews", "about-lane"]) {
  check(
    index.includes(`id="${section}"`),
    `homepage is missing the ${section} editorial column`,
  );
}
check(
  index.includes('<a id="progress-lane" class="notebook-index-item" href="./progress">'),
  "homepage Progress column does not link to the Progress page",
);
check(
  index.includes(
    '<a id="interviews" class="notebook-index-item" href="./interviews">',
  ),
  "homepage Interviews column does not link to the Interviews page",
);
check(
  !index.includes("<pre><code>&lt;span class=\"notebook-index-number\"&gt;02"),
  "homepage Interviews column was rendered as a Markdown code block",
);
check(
  !index.includes('<p><a id="notes" class="notebook-index-item"'),
  "homepage Notes and About columns were wrapped in an invalid paragraph",
);
check(
  !index.includes('class="editorial-rule"'),
  "homepage still renders the progress-bar-style divider",
);
check(
  index.includes("Read article"),
  "homepage article call to action does not say Read article",
);
check(
  index.includes("© 2026 David Estrine. All rights reserved."),
  "homepage footer is missing the approved copyright copy",
);
for (const label of [
  "GitHub",
  "LinkedIn",
  "X",
  "YouTube",
  "Resume",
  "Book a chat",
]) {
  check(
    index.includes(`>${label}<`) || index.includes(`>${label} <`),
    `homepage profile links are missing ${label}`,
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
if (hasSourcePosts) {
  check(
    !index.includes("data-empty-listing"),
    "homepage still shows the empty state after posts were added",
  );
  check(
    index.includes('data-listing-state="ready"'),
    "homepage listing does not report a ready state after posts were added",
  );
  check(
    index.includes('class="recent-carousel carousel slide"'),
    "homepage does not render the recent-article carousel",
  );
  check(
    index.includes('data-bs-ride="carousel"') &&
      index.includes('data-bs-interval="6000"') &&
      index.includes('data-bs-pause="hover"'),
    "homepage recent-article carousel does not auto-advance safely",
  );
  check(
    index.includes('class="carousel-indicators"'),
    "homepage recent-article carousel is missing slide controls",
  );
  const carouselItemCount = (index.match(/class="carousel-item/g) ?? []).length;
  check(
    carouselItemCount >= 1 && carouselItemCount <= 3,
    `homepage carousel must render one to three recent articles, found ${carouselItemCount}`,
  );
  check(
    !index.includes('class="notes-list-item"'),
    "homepage still renders the superseded static article list",
  );
  check(
    !index.includes("data-about-article-feature") &&
      !index.includes('class="about-feature-person"'),
    "homepage still renders the removed combined About Me section",
  );
check(
  index.includes("data-expanded-first-article"),
  "homepage is missing the expanded first-article reader",
);
check(
  !index.includes("/ml-progress#latest") &&
    index.includes('href="./progress"'),
  "homepage latest-progress link does not point to the Progress page",
);
check(
  !index.includes("/interviews#latest") && index.includes('href="./interviews"'),
  "homepage latest-interviews link does not point to the Interviews page",
);
  check(
    index.includes(
      '<p class="expanded-first-kicker">Now reading · First article</p>',
    ),
    "homepage expanded article header was not rendered as structured HTML",
  );
  check(
    !index.includes('&lt;p class="expanded-first-kicker"&gt;'),
    "homepage expanded article header was rendered as a Markdown code block",
  );
  check(
    index.includes("The blog will be separated into 2 sections:") &&
      index.includes("estrinedavid@gmail.com"),
    "homepage does not render the complete first article body",
  );
  check(
    firstArticle.includes("The blog will be separated into 2 sections:") &&
      firstArticle.includes("estrinedavid@gmail.com"),
    "standalone first article no longer renders the shared article body",
  );
  for (const [name, html] of [
    ["homepage", index],
    ["standalone first article", firstArticle],
  ]) {
    check(
      (html.match(/class="article-figure-left"/g) ?? []).length === 2,
      `${name} must shift exactly the two selected figure groups`,
    );
  }
  check(
    /@media\s*\(min-width:\s*901px\)[\s\S]*?\.article-figure-left\s*\{[\s\S]*?transform:\s*translateX\(calc\(-1\s*\*\s*clamp\(/.test(
      sourceStyles,
    ),
    "selected article figures do not shift left on desktop",
  );
  check(
    index.includes(
      'src="./posts/what-is-talkingml/assets/me-c58c04cb.png"',
    ),
    "homepage expanded article image does not use its canonical post asset",
  );
  check(
    index.indexOf('class="recent-carousel carousel slide"') <
      index.indexOf("data-expanded-first-article"),
    "homepage expanded article must follow the recent-articles carousel",
  );
  check(
    !index.includes('href="/posts/what-is-talkingml/content"'),
    "shared article body was incorrectly listed as a standalone article",
  );
  check(
    !sitemap.includes("/posts/what-is-talkingml/content"),
    "shared article body was incorrectly published in the sitemap",
  );
} else {
  check(index.includes("data-empty-listing"), "homepage empty state is missing");
  check(
    index.includes('data-listing-state="empty"'),
    "homepage listing does not report a genuine empty state",
  );
  check(
    !index.includes('class="notes-list-item"'),
    "homepage contains a rendered mock article",
  );
}
check(
  progress.includes('data-archive-state="ready"') &&
    progress.includes('href="/posts/what-is-talkingml/"') &&
    progress.includes("What Is TalkingML?"),
  "Progress page does not list the first Progress article",
);
check(
  !progress.includes("<h1>Progress</h1>") &&
    !progress.includes("Build logs and notes from what I’m learning now."),
  "Progress page still renders the removed large heading or description",
);
check(
  progress.includes('class="section-kicker progress-kicker"') &&
    progress.includes('<span class="listing-date">Aug 29, 2026</span>'),
  "Progress page is missing the compact kicker or current article date",
);
check(
  !progress.includes('class="listing-description"'),
  "Progress archive still renders article descriptions",
);
check(
  index.includes("Published August 29, 2026") &&
    firstArticle.includes("August 29, 2026"),
  "first article date is not current on the homepage and article page",
);
check(
  /\.article-page\s+\.quarto-title-block\s+\.description\s*\{[\s\S]*?display:\s*none;[\s\S]*?\}/.test(
    sourceStyles,
  ),
  "article title-block descriptions are not hidden",
);
check(
  progress.includes('rel="canonical" href="https://talkingml.com/progress"'),
  "Progress canonical URL is missing or incorrect",
);
check(
  !progress.includes('class="profile-margin"'),
  "Progress page should not render the profile block",
);
check(
  interviews.includes("Oops, there are no interviews here yet.") &&
    interviews.includes("Read the most recent article on the homepage"),
  "Interviews page is missing the approved quiet empty state",
);
check(
  interviews.includes('rel="canonical" href="https://talkingml.com/interviews"'),
  "Interviews canonical URL is missing or incorrect",
);
check(
  !interviews.includes('class="profile-margin"') &&
    !interviews.includes("Conversations with people doing the work."),
  "Interviews page still renders the removed profile or heading",
);
check(
  (about.match(/class="profile-margin"/g) ?? []).length === 1 &&
    elementText(about, "profile-bio") === approvedBio,
  "About page does not render exactly one approved profile block",
);
check(
  about.includes("data-site-view-count") &&
    about.includes("Book a chat") &&
    about.includes("David on YouTube"),
  "About page is missing profile links or the view count",
);
check(
  !about.includes("Why TalkingML") &&
    !about.includes("Margin note") &&
    !about.includes("What belongs here"),
  "About page still renders removed editorial content",
);
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
if (hasSourcePosts) {
  check(feed.includes("<item>"), "RSS feed is missing real post items");
} else {
  check(!feed.includes("<item>"), "RSS feed contains a mock article");
}
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
  sitemap.includes("https://talkingml.com/progress"),
  "sitemap is missing the Progress page",
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
  viewsScript.includes('window.location.pathname'),
  "view-count client does not bind counts to the current article path",
);
check(
  viewsScript.includes("new Intl.NumberFormat()"),
  "view-count client does not format totals with Intl.NumberFormat",
);
check(
  !viewsScript.includes("Views unavailable"),
  "view-count client should not display failure text in the page",
);
check(
  viewsScript.includes('className = "article-view-count"'),
  "view-count client does not render an article-level counter",
);
check(
  viewsScript.includes('document.querySelector(".quarto-title-meta")'),
  "view-count client does not place the counter in the article title metadata",
);
check(
  viewsScript.includes("[data-article-views]"),
  "view-count client does not update the article counter",
);
check(
  viewsScript.includes("[data-site-view-count]") &&
    viewsScript.includes("totalViews"),
  "view-count client does not update the overall site counter",
);
check(
  viewsScript.includes("[data-home-article-view-count]") &&
    viewsScript.includes("dataset.articlePath"),
  "view-count client does not credit the expanded homepage article",
);
check(
  !viewsScript.includes("data-total-views"),
  "view-count client still queries the removed site-wide counters",
);
check(
  progressScript.includes("--page-progress") &&
    progressScript.includes("requestAnimationFrame"),
  "reading-progress client does not animate the profile divider from scroll position",
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
    JSON.stringify(["404.html", "about.html", "index.html", "interviews.html", "progress.html"]),
  `unexpected generated HTML pages: ${htmlFiles.join(", ")}`,
);

for (const [name, html] of [
  ["homepage", index],
  ["About page", about],
  ["Progress page", progress],
  ["Interviews page", interviews],
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
