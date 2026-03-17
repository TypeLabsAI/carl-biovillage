/**
 * BK Music — Carl's Ambient Layer
 * K. Leimer "Almost Chinese" seamless loop
 * Auto-starts on first user interaction, fades in gently.
 */
(function () {
  const TRACK_URL = 'almost-chinese-loop.mp3';
  const FADE_IN_MS = 3000;
  const TARGET_VOLUME = 0.25; // calm ambient level (idle/meditation range)
  const FADE_STEP = 20; // ms per volume step

  let ctx, gainNode, source, buffer;
  let started = false;
  let loaded = false;

  // Pre-fetch the audio buffer
  async function loadTrack() {
    try {
      const res = await fetch(TRACK_URL);
      const arrayBuf = await res.arrayBuffer();
      // Don't decode until we have a context (needs user gesture)
      buffer = arrayBuf;
      loaded = true;
    } catch (e) {
      console.warn('[BK Music] Failed to load track:', e);
    }
  }

  async function startPlayback() {
    if (started) return;
    started = true;

    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = ctx.createGain();
      gainNode.gain.value = 0; // start silent
      gainNode.connect(ctx.destination);

      // Decode the pre-fetched buffer
      const audioBuf = await ctx.decodeAudioData(buffer.slice(0)); // slice to avoid detached buffer
      
      source = ctx.createBufferSource();
      source.buffer = audioBuf;
      source.loop = true;
      source.connect(gainNode);
      source.start(0);

      // Fade in
      const steps = FADE_IN_MS / FADE_STEP;
      let step = 0;
      const fadeInterval = setInterval(() => {
        step++;
        gainNode.gain.value = TARGET_VOLUME * (step / steps);
        if (step >= steps) {
          gainNode.gain.value = TARGET_VOLUME;
          clearInterval(fadeInterval);
        }
      }, FADE_STEP);

    } catch (e) {
      console.warn('[BK Music] Playback failed:', e);
      started = false;
    }
  }

  // Start on first interaction (matches village behavior)
  function onInteraction() {
    if (!loaded || started) return;
    startPlayback();
    // Keep listeners for resume after tab switch
  }

  // Handle visibility changes — pause/resume
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      ctx.suspend();
    } else {
      ctx.resume();
    }
  });

  // Listen for any user interaction
  ['click', 'keydown', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, onInteraction, { once: false, passive: true });
  });

  // Start loading immediately
  loadTrack();
})();
