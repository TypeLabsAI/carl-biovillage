/**
 * Loading Screen → Proceed → Reveal + Music
 * Shows "Loading..." while assets load, then fades to "Proceed" button.
 * On click: fades out loading screen, reveals app, starts music.
 */
(function () {
  const screen = document.getElementById('loading-screen');
  const loadingText = document.querySelector('.loading-text');
  const btn = document.getElementById('proceed-btn');
  const app = document.getElementById('app');

  const MIN_LOADING_MS = 1800; // minimum time to show "Loading..."
  const loadStart = Date.now();

  let assetsReady = false;
  let musicReady = false;

  function showProceed() {
    if (!assetsReady || !musicReady) return;

    const elapsed = Date.now() - loadStart;
    const remaining = Math.max(0, MIN_LOADING_MS - elapsed);

    setTimeout(() => {
      // Fade out "Loading..." then show Proceed
      loadingText.style.opacity = '0';
      loadingText.style.transition = 'opacity 400ms ease';

      setTimeout(() => {
        loadingText.style.display = 'none';
        btn.classList.remove('hidden');
      }, 400);
    }, remaining);
  }

  // Wait for music buffer to load
  window.addEventListener('bk-music-ready', () => {
    musicReady = true;
    showProceed();
  });

  // Wait for key assets (billboard image + fonts)
  window.addEventListener('load', () => {
    assetsReady = true;
    showProceed();
  });

  // Fallback: if music takes too long, show Proceed after 5s anyway
  setTimeout(() => {
    if (!musicReady) {
      musicReady = true;
      showProceed();
    }
  }, 5000);

  // Proceed click
  btn.addEventListener('click', () => {
    // Fade out loading screen
    screen.classList.add('fade-out');

    // Reveal app
    app.classList.remove('hidden');

    // Start music (user gesture context)
    if (typeof window.startMusic === 'function') {
      window.startMusic();
    }

    // Remove loading screen from DOM after transition
    setTimeout(() => {
      screen.remove();
    }, 700);
  });
})();
