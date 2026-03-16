/* Chat system for Carl character
   Works with both Perplexity deployment (__PORT_8000__) and
   Cloudflare Worker (/api/chat)
   Now with proto data parsing and cosmic destination */
(function () {
  // Detect API endpoint
  const portPlaceholder = "__PORT_8000__";
  const API = portPlaceholder.startsWith("__")
    ? ""  // relative path
    : portPlaceholder;

  const chatArea = document.getElementById("chat-area");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");

  let isStreaming = false;
  let conversationHistory = [];
  const MAX_HISTORY = 20;

  // ── Parse proto data from URL ──
  let protoData = null;
  let playerDestination = null;
  const params = new URLSearchParams(window.location.search);
  const fromVillage = params.get("from") === "village";

  if (params.has("proto")) {
    try {
      protoData = JSON.parse(decodeURIComponent(params.get("proto")));
    } catch (e) {
      console.warn("Failed to parse proto data:", e);
    }
  }

  // ── Update greeting if player has proto data ──
  function updateGreeting() {
    const greeting = document.querySelector(".greeting");
    const subtext = document.querySelector(".subtext");
    
    if (protoData && protoData.name) {
      greeting.textContent = `Hello, ${protoData.name}.`;
      subtext.textContent = "The cosmos has been expecting you.";
    } else if (fromVillage) {
      greeting.textContent = "Hello traveler.";
      subtext.textContent = "You were looking up at the stars.";
    }
  }

  // ── Compute and display cosmic destination ──
  async function showCosmicDestination() {
    if (!protoData || !protoData.biomarkers) return;

    const destCard = document.getElementById("destination-card");
    if (!destCard) return;

    // Compute destination client-side (same logic as worker)
    const dest = computeDestination(protoData.biomarkers);
    if (!dest) return;

    playerDestination = dest;

    // Fill in the card
    const emoji = destCard.querySelector(".dest-emoji");
    const name = destCard.querySelector(".dest-name");
    const subtitle = destCard.querySelector(".dest-subtitle");
    const statsGrid = destCard.querySelector(".dest-stats");

    emoji.textContent = dest.emoji;
    name.textContent = dest.name;
    subtitle.textContent = dest.subtitle;

    // Show key biomarkers as mini stats
    if (protoData.biomarkers && statsGrid) {
      const markers = [];
      const bio = protoData.biomarkers;
      if (bio.hsCRP != null) markers.push({ label: "hs-CRP", val: bio.hsCRP, good: bio.hsCRP < 1 });
      if (bio.hdl != null) markers.push({ label: "HDL", val: bio.hdl, good: bio.hdl > 50 });
      if (bio.ldl != null) markers.push({ label: "LDL", val: bio.ldl, good: bio.ldl < 130 });
      if (bio.triglycerides != null) markers.push({ label: "Trig", val: bio.triglycerides, good: bio.triglycerides < 150 });
      if (bio.apoB != null) markers.push({ label: "ApoB", val: bio.apoB, good: bio.apoB < 100 });
      if (bio.omega3 != null) markers.push({ label: "Ω-3", val: bio.omega3 + "%", good: bio.omega3 > 6 });

      statsGrid.innerHTML = markers.slice(0, 6).map(m =>
        `<div class="dest-stat ${m.good ? 'good' : 'warn'}">
          <span class="dest-stat-val">${m.val}</span>
          <span class="dest-stat-label">${m.label}</span>
        </div>`
      ).join("");
    }

    // Show the card with animation
    destCard.classList.remove("hidden");
    destCard.classList.add("entering");
    requestAnimationFrame(() => {
      destCard.classList.remove("entering");
    });

    // Auto-trigger Carl's analysis after a beat
    setTimeout(() => {
      triggerCosmicAnalysis();
    }, 1200);
  }

  function triggerCosmicAnalysis() {
    if (!protoData || !protoData.biomarkers) return;
    // Send a message as if the player asked for their destination
    const autoMsg = "Read my biomarkers and tell me — where in the cosmos should I aim?";
    sendMessage(autoMsg, true);
  }

  // ── Client-side destination computation (mirrors worker.js) ──
  function computeDestination(biomarkers) {
    if (!biomarkers) return null;
    const bio = biomarkers;
    let score = 50;

    if (bio.hsCRP != null) {
      if (bio.hsCRP < 0.3) score += 20;
      else if (bio.hsCRP < 0.5) score += 15;
      else if (bio.hsCRP < 1) score += 10;
      else if (bio.hsCRP < 3) score += 0;
      else score -= 15;
    }
    if (bio.hdl != null) {
      if (bio.hdl > 60) score += 10;
      else if (bio.hdl > 55) score += 7;
      else if (bio.hdl > 45) score += 3;
      else score -= 5;
    }
    if (bio.ldl != null) {
      if (bio.ldl < 100) score += 10;
      else if (bio.ldl < 130) score += 5;
      else if (bio.ldl < 160) score += 0;
      else if (bio.ldl < 190) score -= 5;
      else score -= 10;
    }
    if (bio.triglycerides != null) {
      if (bio.triglycerides < 100) score += 10;
      else if (bio.triglycerides < 120) score += 7;
      else if (bio.triglycerides < 150) score += 3;
      else if (bio.triglycerides < 250) score -= 3;
      else score -= 10;
    }
    if (bio.apoB != null) {
      if (bio.apoB < 80) score += 10;
      else if (bio.apoB < 100) score += 5;
      else if (bio.apoB < 120) score += 0;
      else score -= 7;
    }
    if (bio.ldlParticleNumber != null) {
      if (bio.ldlParticleNumber < 1000) score += 10;
      else if (bio.ldlParticleNumber < 1300) score += 5;
      else if (bio.ldlParticleNumber < 1600) score += 0;
      else score -= 7;
    }
    if (bio.homocysteine != null) {
      if (bio.homocysteine < 7) score += 8;
      else if (bio.homocysteine < 10) score += 3;
      else score -= 5;
    }
    if (bio.omega3 != null) {
      if (bio.omega3 > 8) score += 8;
      else if (bio.omega3 > 6) score += 4;
      else if (bio.omega3 > 4) score += 0;
      else score -= 5;
    }
    if (bio.ferritin != null) {
      if (bio.ferritin >= 50 && bio.ferritin <= 150) score += 5;
      else if (bio.ferritin >= 30 && bio.ferritin <= 200) score += 2;
      else score -= 3;
    }

    if (score >= 120) return { id: "proxima", name: "Proxima Centauri", emoji: "⭐", subtitle: "The Next Star" };
    if (score >= 100) return { id: "neptune", name: "Neptune", emoji: "🌌", subtitle: "The Deep Blue" };
    if (score >= 85) return { id: "saturn", name: "Saturn", emoji: "💫", subtitle: "The Ringed Wonder" };
    if (score >= 70) return { id: "jupiter", name: "Jupiter", emoji: "🪐", subtitle: "The Great Expanse" };
    if (score >= 55) return { id: "sun", name: "The Sun's Orbit", emoji: "☀️", subtitle: "The Inner Fire" };
    if (score >= 40) return { id: "mars", name: "Mars", emoji: "🔴", subtitle: "The Red Frontier" };
    return { id: "moon", name: "The Moon", emoji: "🌙", subtitle: "The Threshold" };
  }

  // ── Message rendering ──
  function addUserMessage(text, isAuto) {
    const div = document.createElement("div");
    div.className = "message message-user" + (isAuto ? " auto-msg" : "");
    div.textContent = text;
    chatArea.appendChild(div);
    scrollToBottom();
  }

  function addCarlMessage() {
    const div = document.createElement("div");
    div.className = "message message-carl";
    div.innerHTML = `
      <div class="carl-name">Carl</div>
      <div class="carl-text streaming"></div>
    `;
    chatArea.appendChild(div);
    scrollToBottom();
    return div.querySelector(".carl-text");
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatArea.scrollTop = chatArea.scrollHeight;
    });
  }

  async function sendMessage(text, isAutoTriggered) {
    if (isStreaming || !text.trim()) return;

    isStreaming = true;
    sendBtn.disabled = true;
    chatInput.disabled = true;

    if (!isAutoTriggered) {
      addUserMessage(text, false);
    } else {
      // For auto-triggered, show a subtle system message instead
      addUserMessage(text, true);
    }

    const carlText = addCarlMessage();

    // Add to client-side history
    conversationHistory.push({ role: "user", content: text });
    if (conversationHistory.length > MAX_HISTORY) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY);
    }

    try {
      const payload = {
        message: text,
        history: conversationHistory.slice(0, -1),
      };

      // Include proto data if available
      if (protoData) {
        payload.proto = protoData;
      }

      const response = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to reach Carl");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              fullResponse += data.text;
              carlText.textContent += data.text;
              scrollToBottom();
            }
            if (data.done) {
              carlText.classList.remove("streaming");
            }
            if (data.error) {
              carlText.textContent = "The stars are quiet right now. Try again in a moment.";
              carlText.classList.remove("streaming");
            }
          } catch (e) {
            // skip malformed chunks
          }
        }
      }

      // Store Carl's response in client history
      if (fullResponse) {
        conversationHistory.push({ role: "assistant", content: fullResponse });
      }

      carlText.classList.remove("streaming");
    } catch (err) {
      carlText.textContent = "The stars are quiet right now. Try again in a moment.";
      carlText.classList.remove("streaming");
    }

    isStreaming = false;
    sendBtn.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  }

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = "";
    sendMessage(text, false);
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
    }
  });

  // ── Initialize ──
  updateGreeting();
  showCosmicDestination();
})();
