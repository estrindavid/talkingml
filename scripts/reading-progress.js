(() => {
  const profile = document.querySelector(".profile-margin");

  if (!profile) return;

  let framePending = false;

  const updateProgress = () => {
    const page = document.documentElement;
    const scrollable = Math.max(page.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(window.scrollY / scrollable, 0), 1);

    profile.style.setProperty("--page-progress", progress.toFixed(4));
    framePending = false;
  };

  const requestUpdate = () => {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(updateProgress);
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  updateProgress();
})();
