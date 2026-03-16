/* Animated starfield background — deep indigo cosmos */
(function () {
  const canvas = document.getElementById("starfield");
  const ctx = canvas.getContext("2d");
  let w, h, stars;
  const STAR_COUNT = 200;
  const TWINKLE_SPEED = 0.003;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function createStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * TWINKLE_SPEED + 0.001,
        // Some stars have a slight blue/lavender tint
        hue: 220 + Math.random() * 40,
        sat: Math.random() * 30 + 10,
      });
    }
  }

  function draw(t) {
    // Deep indigo gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#060610");
    grad.addColorStop(0.4, "#0a0a1a");
    grad.addColorStop(0.7, "#0d0d24");
    grad.addColorStop(1, "#0a0a1a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle nebula glow in the upper area
    const nebula = ctx.createRadialGradient(
      w * 0.65, h * 0.2, 0,
      w * 0.65, h * 0.2, w * 0.4
    );
    nebula.addColorStop(0, "rgba(60, 40, 100, 0.06)");
    nebula.addColorStop(0.5, "rgba(40, 30, 80, 0.03)");
    nebula.addColorStop(1, "transparent");
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, w, h);

    // Draw stars
    for (const s of stars) {
      const alpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.speed * 60 + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${s.hue}, ${s.sat}%, 85%, ${alpha})`;
      ctx.fill();

      // Glow for brighter stars
      if (s.r > 1) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, ${s.sat}%, 85%, ${alpha * 0.08})`;
        ctx.fill();
      }
    }
  }

  let raf;
  function loop(t) {
    draw(t * 0.001);
    raf = requestAnimationFrame(loop);
  }

  // Respect reduced motion
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  resize();
  createStars();

  if (prefersReduced) {
    draw(0);
  } else {
    loop(0);
  }

  window.addEventListener("resize", () => {
    resize();
    createStars();
    if (prefersReduced) draw(0);
  });
})();
