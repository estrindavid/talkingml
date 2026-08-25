(() => {
  const viewElements = Array.from(
    document.querySelectorAll("[data-total-views]"),
  );

  if (viewElements.length === 0) {
    return;
  }

  viewElements[0].setAttribute("aria-live", "polite");

  const updateViews = (value, available) => {
    for (const element of viewElements) {
      element.textContent = value;
      const label = element.parentElement?.querySelector("[data-views-label]");

      if (label) {
        label.hidden = !available;
      }
    }
  };

  const loadViews = async () => {
    try {
      const response = await fetch("/api/views", {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error("Views endpoint unavailable");
      }

      const payload = await response.json();
      const views = Number(payload.views);

      if (!Number.isSafeInteger(views) || views < 0) {
        throw new Error("Invalid views response");
      }

      updateViews(new Intl.NumberFormat().format(views), true);
    } catch {
      updateViews("Views unavailable", false);
    }
  };

  void loadViews();
})();
