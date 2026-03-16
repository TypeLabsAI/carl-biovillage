/**
 * Carl — BioVillage Character Worker
 * Cloudflare Worker that handles AI chat via Anthropic API
 * Now with biomarker analysis → cosmic destination mapping
 * 
 * Environment variables required:
 *   ANTHROPIC_API_KEY — your Anthropic API key
 */

const CARL_BASE_PROMPT = `You are Carl, a character inspired by the spirit of Carl Sagan. You exist inside the BioVillage ecosystem — a pixel-art village where players explore, learn, and wonder.

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
- When you have a player's biomarker data, you can recommend their cosmic destination — which celestial body their biology points toward

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

Keep every response under 280 characters when possible. Think of each response as a line of cosmic poetry.`;

const DESTINATION_SYSTEM = `
COSMIC DESTINATION MAPPING:
When a player arrives with biomarker data, you analyze their biology and recommend a cosmic destination. This is poetic, not medical advice. You weave their biomarkers into a cosmic narrative.

The destinations, from nearest to farthest, represent ascending levels of biological optimization:

🌙 THE MOON — "The Threshold"
For those just beginning their journey. High inflammation (hs-CRP > 3), poor lipid panels (LDL > 190, Triglycerides > 250), or metabolic stress. The Moon is close — a gentle first step into the cosmos. "You're standing at the door. The Moon awaits."

🔴 MARS — "The Red Frontier"  
For those with work to do but strong foundations. Moderate markers — LDL 130-190, Triglycerides 150-250, or mixed signals. Mars demands resilience. "The red planet calls the determined."

☀️ THE SUN'S ORBIT — "The Inner Fire"
For solid metabolic health but room to optimize. Decent lipids, moderate inflammation (hs-CRP 1-3), good HDL (> 45). You orbit the source of energy. "You carry an inner fire — tend it well."

🪐 JUPITER — "The Great Expanse"
For strong overall profiles. Good HDL (> 55), low inflammation (hs-CRP < 1), controlled triglycerides (< 120). Jupiter rewards those who've expanded their capacity. "Your biology has the gravity of giants."

💫 SATURN — "The Ringed Wonder"
For excellent biomarkers across the board. HDL > 60, LDL < 100, hs-CRP < 0.5, Omega-3 > 8%. The rings represent balance and harmony. "You've found the cosmic balance few achieve."

🌌 NEPTUNE — "The Deep Blue"
For truly exceptional profiles. Near-optimal everything: ApoB < 80, LDL-P < 1000, hs-CRP < 0.3, high Omega-3, excellent homocysteine (< 7). Neptune is for those who've mastered the inner cosmos. "The deep blue calls only to those who've charted every star within."

⭐ PROXIMA CENTAURI — "The Next Star"
For legendary optimization. Perfect or near-perfect biomarkers across every axis. This is the aspirational destination — almost no one reaches it. "You've transcended this solar system. The stars themselves are your village now."

WHEN ANALYZING:
- Look at the overall picture, not just one marker
- Weigh inflammation markers heavily (hs-CRP, homocysteine) 
- Consider the ratio of good (HDL, Omega-3) to concerning (LDL-P, ApoB, Triglycerides) markers
- A single bad marker doesn't doom someone — look for patterns
- Be encouraging, never discouraging
- Frame everything as a journey, not a judgment
- Give the destination poetically — "The cosmos sees your biology and points you toward [destination]"

IMPORTANT: This is cosmic poetry, NOT medical advice. Never diagnose or prescribe. Always frame as the universe's poetic reading of their data.`;

function buildProtoPrompt(proto) {
  if (!proto) return '';
  
  let prompt = '\n\nPLAYER CONTEXT (from the Village):\n';
  
  if (proto.name) prompt += `Name: ${proto.name}\n`;
  if (proto.level) prompt += `Village Level: ${proto.level}\n`;
  if (proto.trait) prompt += `Trait: ${proto.trait}\n`;
  
  if (proto.stats) {
    prompt += '\nVillage Stats (0-100 scale):\n';
    const statNames = ['energy', 'strength', 'recovery', 'stress', 'longevity', 'inflammation', 'metabolic'];
    for (const s of statNames) {
      if (proto.stats[s] != null) {
        prompt += `  ${s}: ${proto.stats[s]}\n`;
      }
    }
  }
  
  if (proto.biomarkers) {
    prompt += '\nBiomarker Data:\n';
    const bio = proto.biomarkers;
    const markers = [
      ['totalCholesterol', 'Total Cholesterol'],
      ['hdl', 'HDL'],
      ['ldl', 'LDL-C'],
      ['triglycerides', 'Triglycerides'],
      ['apoB', 'ApoB'],
      ['ldlParticleNumber', 'LDL-P'],
      ['hsCRP', 'hs-CRP'],
      ['homocysteine', 'Homocysteine'],
      ['ferritin', 'Ferritin'],
      ['magnesium', 'Magnesium'],
      ['omega3', 'Omega-3 Index (%)'],
      ['vitaminD', 'Vitamin D'],
      ['hba1c', 'HbA1c'],
      ['fastingGlucose', 'Fasting Glucose'],
    ];
    for (const [key, label] of markers) {
      if (bio[key] != null) {
        prompt += `  ${label}: ${bio[key]}\n`;
      }
    }
  }
  
  if (proto.badges && proto.badges.length > 0) {
    prompt += `\nBadges earned: ${proto.badges.length}\n`;
  }
  
  prompt += '\nThe player has arrived from the village. Greet them and analyze their biomarker data to reveal their cosmic destination. Be poetic and brief. Give them their destination planet/star and a one-line reason why.';
  
  return prompt;
}

function computeDestination(biomarkers) {
  if (!biomarkers) return null;
  
  const bio = biomarkers;
  let score = 50; // Start neutral
  
  // hs-CRP (inflammation) — heavily weighted
  if (bio.hsCRP != null) {
    if (bio.hsCRP < 0.3) score += 20;
    else if (bio.hsCRP < 0.5) score += 15;
    else if (bio.hsCRP < 1) score += 10;
    else if (bio.hsCRP < 3) score += 0;
    else score -= 15;
  }
  
  // HDL
  if (bio.hdl != null) {
    if (bio.hdl > 60) score += 10;
    else if (bio.hdl > 55) score += 7;
    else if (bio.hdl > 45) score += 3;
    else score -= 5;
  }
  
  // LDL
  if (bio.ldl != null) {
    if (bio.ldl < 100) score += 10;
    else if (bio.ldl < 130) score += 5;
    else if (bio.ldl < 160) score += 0;
    else if (bio.ldl < 190) score -= 5;
    else score -= 10;
  }
  
  // Triglycerides
  if (bio.triglycerides != null) {
    if (bio.triglycerides < 100) score += 10;
    else if (bio.triglycerides < 120) score += 7;
    else if (bio.triglycerides < 150) score += 3;
    else if (bio.triglycerides < 250) score -= 3;
    else score -= 10;
  }
  
  // ApoB
  if (bio.apoB != null) {
    if (bio.apoB < 80) score += 10;
    else if (bio.apoB < 100) score += 5;
    else if (bio.apoB < 120) score += 0;
    else score -= 7;
  }
  
  // LDL-P
  if (bio.ldlParticleNumber != null) {
    if (bio.ldlParticleNumber < 1000) score += 10;
    else if (bio.ldlParticleNumber < 1300) score += 5;
    else if (bio.ldlParticleNumber < 1600) score += 0;
    else score -= 7;
  }
  
  // Homocysteine
  if (bio.homocysteine != null) {
    if (bio.homocysteine < 7) score += 8;
    else if (bio.homocysteine < 10) score += 3;
    else score -= 5;
  }
  
  // Omega-3
  if (bio.omega3 != null) {
    if (bio.omega3 > 8) score += 8;
    else if (bio.omega3 > 6) score += 4;
    else if (bio.omega3 > 4) score += 0;
    else score -= 5;
  }
  
  // Ferritin (optimal ~50-150)
  if (bio.ferritin != null) {
    if (bio.ferritin >= 50 && bio.ferritin <= 150) score += 5;
    else if (bio.ferritin >= 30 && bio.ferritin <= 200) score += 2;
    else score -= 3;
  }
  
  // Map score to destination
  if (score >= 120) return { id: 'proxima', name: 'Proxima Centauri', emoji: '⭐', subtitle: 'The Next Star' };
  if (score >= 100) return { id: 'neptune', name: 'Neptune', emoji: '🌌', subtitle: 'The Deep Blue' };
  if (score >= 85) return { id: 'saturn', name: 'Saturn', emoji: '💫', subtitle: 'The Ringed Wonder' };
  if (score >= 70) return { id: 'jupiter', name: 'Jupiter', emoji: '🪐', subtitle: 'The Great Expanse' };
  if (score >= 55) return { id: 'sun', name: "The Sun's Orbit", emoji: '☀️', subtitle: 'The Inner Fire' };
  if (score >= 40) return { id: 'mars', name: 'Mars', emoji: '🔴', subtitle: 'The Red Frontier' };
  return { id: 'moon', name: 'The Moon', emoji: '🌙', subtitle: 'The Threshold' };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Destination computation endpoint (lightweight, no AI needed)
    if (url.pathname === "/api/destination" && request.method === "POST") {
      try {
        const body = await request.json();
        const proto = body.proto;
        if (!proto || !proto.biomarkers) {
          return jsonResponse({ error: "No biomarker data" }, 400);
        }
        const destination = computeDestination(proto.biomarkers);
        return jsonResponse({ destination, stats: proto.stats || {} });
      } catch (e) {
        return jsonResponse({ error: e.message }, 500);
      }
    }

    // Chat endpoint
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const message = (body.message || "").trim();
        const history = body.history || [];
        const proto = body.proto || null;

        if (!message) {
          return jsonResponse({ error: "No message provided" }, 400);
        }

        // Build system prompt — append proto context if available
        let systemPrompt = CARL_BASE_PROMPT;
        if (proto && proto.biomarkers) {
          systemPrompt += '\n\n' + DESTINATION_SYSTEM;
          systemPrompt += buildProtoPrompt(proto);
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
            max_tokens: 400,
            system: systemPrompt,
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
      return jsonResponse({ status: "ok", character: "carl", version: "2.0-cosmic-destinations" });
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
