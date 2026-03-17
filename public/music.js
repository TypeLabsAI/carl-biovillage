/**
 * BK Music — Carl's Ambient Layer
 * K. Leimer "Almost Chinese" seamless loop
 * Exposes window.startMusic() — called by loader.js on Proceed click.
 */
(function () {
  const TRACK_URL = 'almost-chinese-loop.mp3';
  const FADE_IN_MS = 3000;
  const TARGET_VOLUME = 0.25;
  const FADE_STEP = 20;

  let ctx, gainNode, source;
  let buffer = null;
  let started = false;
  let loaded = false;

  // Pre-fetch the audio buffer
  async function loadTrack() {
    try {
      const res = await fetch(TRACK_URL);
      buffer = await res.arrayBuffer();
      loaded = true;
      // Signal that audio is ready
      window.dispatchEvent(new Event('bk-music-ready'));
    } catch (e) {
      console.warn('[BK Music] Failed to load track:', e);
      // Still signal ready so the UI isn't stuck
      window.dispatchEvent(new Event('bk-music-ready'));
    }
  }

  async function startPlayback() {
    if (started || !loaded || !buffer) return;
    started = true;

    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = ctx.createGain();
      gainNode.gain.value = 0;
      gainNode.connect(ctx.destination);

      const audioBuf = await ctx.decodeAudioData(buffer.slice(0));
      
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

  // Handle visibility changes
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  // Expose globally for loader.js
  window.startMusic = startPlayback;
  window.isMusicLoaded = () => loaded;

  // Start loading immediately
  loadTrack();
})();
