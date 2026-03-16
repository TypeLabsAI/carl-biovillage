/* Pixel art Carl avatar — Carl Sagan inspired
   Dark wavy hair, warm expression, black turtleneck
   16x16 pixel grid rendered at 80x80 canvas */
(function () {
  const canvas = document.getElementById("carl-avatar");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = 80;
  const H = 80;
  const P = 5; // pixel size (80 / 16 = 5px per "pixel")

  // Color palette
  const C = {
    ".": null,          // transparent / background
    "0": "#0d0d24",     // background dark indigo
    "h": "#2a1e14",     // hair darkest
    "H": "#3d2c1f",     // hair mid
    "r": "#4a3628",     // hair light
    "s": "#d4a574",     // skin base
    "S": "#c49060",     // skin shadow
    "L": "#e0b888",     // skin highlight
    "t": "#181818",     // turtleneck dark
    "T": "#242424",     // turtleneck mid
    "b": "#4a3628",     // eyebrow
    "e": "#16100a",     // eye dark (pupil)
    "w": "#e8e4dc",     // eye white
    "n": "#b87a58",     // nose shadow
    "m": "#c4876a",     // mouth/lip
    "E": "#b8805c",     // ear shadow
  };

  // 16x16 pixel grid
  const sprite = [
    "....hHHHh.......",
    "...hHHrHHh......",
    "..hHrHHHrHh.....",
    "..HHHHHHHHHh....",
    "..HbsLsbsLbH....",
    "..HswesswesH.E..",
    "..HsssnsssSHE...",
    "...SssnssSE.....",
    "...SssmsSS......",
    "....SsssSH......",
    "....htTTth......",
    "...tTTTTTt......",
    "..tTTTTTTTt.....",
    ".tTTTTTTTTTt....",
    ".tTTTTTTTTTt....",
    "..tTTTTTTTt.....",
  ];

  // Subtle idle breathing animation
  let frame = 0;
  const BREATHE_SPEED = 0.02;

  function drawAvatar(time) {
    ctx.clearRect(0, 0, W, H);

    // Subtle background glow
    const grad = ctx.createRadialGradient(W / 2, H / 2, 8, W / 2, H / 2, 42);
    grad.addColorStop(0, "rgba(100, 120, 180, 0.05)");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Slight breathing offset for life
    const breathe = Math.sin(time * BREATHE_SPEED) * 0.3;

    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const ch = sprite[y][x];
        if (ch === "." || ch === "0") continue;
        const color = C[ch];
        if (!color) continue;

        // Apply subtle vertical breathing to body rows (10-15)
        const yOffset = y >= 10 ? breathe : 0;

        ctx.fillStyle = color;
        ctx.fillRect(x * P, y * P + yOffset, P, P);
      }
    }
  }

  // Check reduced motion preference
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReduced) {
    drawAvatar(0);
  } else {
    function loop(t) {
      drawAvatar(t * 0.001);
      requestAnimationFrame(loop);
    }
    loop(0);
  }
})();
