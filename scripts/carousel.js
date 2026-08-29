(() => {
  const initializeRecentCarousel = () => {
    const carouselElement = document.querySelector(".recent-carousel");

    if (!carouselElement) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pause = () => carouselElement.dispatchEvent(new Event("mouseenter"));
    const play = () => carouselElement.dispatchEvent(new Event("mouseleave"));
    const syncPlayback = () => {
      if (reducedMotion.matches) pause();
      else play();
    };

    carouselElement.addEventListener("focusin", pause);
    carouselElement.addEventListener("focusout", (event) => {
      if (!carouselElement.contains(event.relatedTarget)) syncPlayback();
    });
    reducedMotion.addEventListener?.("change", syncPlayback);
    carouselElement.dataset.carouselReady = "true";
    syncPlayback();
  };

  window.addEventListener("load", initializeRecentCarousel, { once: true });
})();
