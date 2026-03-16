/* Chat system for Carl character
   Works with both Perplexity deployment (__PORT_8000__) and
   Cloudflare Worker (/api/chat) */
(function () {
  // Detect API endpoint:
  // - On Perplexity deployment: __PORT_8000__ gets replaced with proxy path
  // - On Cloudflare Pages + Worker: use relative /api/chat
  const portPlaceholder = "__PORT_8000__";
  const API = portPlaceholder.startsWith("__")
    ? ""  // relative path — works for both localhost and Cloudflare
    : portPlaceholder;

  const chatArea = document.getElementById("chat-area");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");

  let isStreaming = false;
  let conversationHistory = []; // Client-side history for stateless backend
  const MAX_HISTORY = 20;

  function addUserMessage(text) {
    const div = document.createElement("div");
    div.className = "message message-user";
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

  async function sendMessage(text) {
    if (isStreaming || !text.trim()) return;

    isStreaming = true;
    sendBtn.disabled = true;
    chatInput.disabled = true;

    addUserMessage(text);
    const carlText = addCarlMessage();

    // Add to client-side history
    conversationHistory.push({ role: "user", content: text });
    if (conversationHistory.length > MAX_HISTORY) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY);
    }

    try {
      const response = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: conversationHistory.slice(0, -1), // Send history without current message
        }),
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

      // Ensure streaming indicator is removed
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
    sendMessage(text);
  });

  // Allow Enter to send
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
    }
  });
})();
