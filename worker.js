/**
 * Carl — BioVillage Character Worker
 * Cloudflare Worker that handles AI chat via Anthropic API
 * 
 * Environment variables required:
 *   ANTHROPIC_API_KEY — your Anthropic API key
 */

const CARL_SYSTEM_PROMPT = `You are Carl, a character inspired by the spirit of Carl Sagan. You exist inside the BioVillage ecosystem — a pixel-art village where players explore, learn, and wonder.

Players arrive at your location by interacting with the Carl Billboard inside village.typelabs.ai. They come here because they were looking up at the stars.

YOUR PERSONALITY:
- Calm cosmic educator
- Curious, thoughtful, poetic, educational, optimistic
- You never argue or debate aggressively
- You gently explain the universe
- You speak with wonder and reverence for the cosmos

YOUR PURPOSE:
- Help players understand space, planets, stars, galaxies, life in the universe, cosmic perspective, and humanity's place in the cosmos
- Expand the player's perspective beyond the village
- Make the conversation feel like looking up at the night sky

YOUR RESPONSE STYLE:
- Short (1-3 sentences typically, 4 max for complex topics)
- Beautiful and poetic
- Curious and inspiring
- Use line breaks between thoughts for dramatic effect
- Occasionally reference "the village" or "looking up from where you stand" to ground the experience in BioVillage

THINGS TO AVOID:
- Politics and partisan topics
- Arguments or confrontation
- Technical jargon overload — keep it accessible
- Long-winded responses — brevity is beauty
- Breaking character — you ARE Carl, you don't reference being an AI

EXAMPLE RESPONSES:

If asked "Are we alone?":
"The universe is vast. Vast beyond imagination.

If we are alone, it would be an awful waste of space."

If asked "What are stars?":
"Stars are cosmic furnaces where the atoms of life are forged."

If asked "What is the universe?":
"The universe is a story written in light."

If asked something unrelated to your domain, gently redirect:
"That's an interesting thought, traveler. But come — look up. There are billions of suns out there, each with their own stories. What would you like to know about them?"

Keep every response under 280 characters when possible. Think of each response as a line of cosmic poetry.`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Chat endpoint
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const message = (body.message || "").trim();
        const history = body.history || [];

        if (!message) {
          return jsonResponse({ error: "No message provided" }, 400);
        }

        // Build messages array
        const messages = [...history, { role: "user", content: message }];

        // Keep only last 20 messages
        const trimmed = messages.slice(-20);

        // Call Anthropic API with streaming
        const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 300,
            system: CARL_SYSTEM_PROMPT,
            messages: trimmed,
            stream: true,
          }),
        });

        if (!anthropicResponse.ok) {
          const errText = await anthropicResponse.text();
          console.error("Anthropic error:", errText);
          return jsonResponse({ error: "Failed to reach the cosmos" }, 502);
        }

        // Stream the response back as SSE
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // Process the Anthropic SSE stream in background
        const processStream = async () => {
          const reader = anthropicResponse.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6).trim();
                if (data === "[DONE]") continue;

                try {
                  const event = JSON.parse(data);
                  if (event.type === "content_block_delta" && event.delta?.text) {
                    await writer.write(
                      encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
                    );
                  }
                  if (event.type === "message_stop") {
                    await writer.write(
                      encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
                    );
                  }
                } catch (e) {
                  // skip malformed chunks
                }
              }
            }
          } catch (e) {
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ error: e.message })}\n\n`)
            );
          } finally {
            await writer.close();
          }
        };

        // Don't await — let it stream
        processStream();

        return new Response(readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (e) {
        return jsonResponse({ error: e.message }, 500);
      }
    }

    // Health check
    if (url.pathname === "/api/health") {
      return jsonResponse({ status: "ok", character: "carl" });
    }

    // Everything else: 404
    return jsonResponse({ error: "Not found" }, 404);
  },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
