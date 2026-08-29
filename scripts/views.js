(() => {
  const pagePath = window.location.pathname;
  const isArticlePage = pagePath.startsWith("/posts/") && pagePath.endsWith("/");
  const homeArticleCounter = document.querySelector(
    "[data-home-article-view-count]",
  );
  const articlePath = isArticlePage
    ? pagePath
    : homeArticleCounter?.dataset.articlePath;
  const siteCounter = document.querySelector("[data-site-view-count]");

  let articleCounter = homeArticleCounter;

  if (isArticlePage) {
    const titleMeta = document.querySelector(".quarto-title-meta");

    if (titleMeta) {
      articleCounter = document.createElement("div");
      articleCounter.className = "article-view-count";
      articleCounter.hidden = true;
      articleCounter.innerHTML = `
        <div class="quarto-title-meta-heading">Views</div>
        <div class="quarto-title-meta-contents">
          <p>
            <span data-article-views>0</span>
            <span data-views-label>views</span>
          </p>
        </div>
      `;
      titleMeta.append(articleCounter);
    }
  }

  const format = (value) => new Intl.NumberFormat().format(value);
  const validCount = (value) => Number.isSafeInteger(value) && value >= 0;

  const showArticleViews = (views) => {
    if (!articleCounter || !validCount(views)) return;

    const valueElement = articleCounter.querySelector("[data-article-views]");
    const labelElement = articleCounter.querySelector("[data-views-label]");

    if (!valueElement) return;

    valueElement.textContent = format(views);
    if (labelElement) labelElement.textContent = views === 1 ? "view" : "views";
    articleCounter.hidden = false;
  };

  const showSiteViews = (totalViews) => {
    if (!siteCounter || !validCount(totalViews)) return;

    const valueElement = siteCounter.querySelector("[data-site-views]");
    const labelElement = siteCounter.querySelector("[data-site-views-label]");
    if (!valueElement) return;

    valueElement.textContent = format(totalViews);
    if (labelElement) {
      labelElement.textContent = totalViews === 1 ? "view" : "views";
    }
    siteCounter.hidden = false;
  };

  const loadViews = async () => {
    try {
      const params = new URLSearchParams();
      if (articlePath) params.set("path", articlePath);

      const query = params.size > 0 ? `?${params}` : "";
      const response = await fetch(`/api/views${query}`, {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        keepalive: true,
      });

      if (!response.ok) throw new Error("Views endpoint unavailable");

      const payload = await response.json();
      showSiteViews(Number(payload.totalViews));
      if (articlePath) showArticleViews(Number(payload.views));
    } catch {
      if (siteCounter) siteCounter.hidden = true;
      if (articleCounter) articleCounter.hidden = true;
    }
  };

  void loadViews();
})();
