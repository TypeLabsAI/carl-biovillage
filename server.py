#!/usr/bin/env python3
"""Carl character chat server — BioVillage ecosystem."""

import json
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from anthropic import Anthropic

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Anthropic()

CARL_SYSTEM_PROMPT = """You are Carl, a character inspired by the spirit of Carl Sagan. You exist inside the BioVillage ecosystem — a pixel-art village where players explore, learn, and wonder.

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

Keep every response under 280 characters when possible. Think of each response as a line of cosmic poetry."""


# In-memory conversation storage per visitor
conversations: dict[str, list[dict]] = {}
MAX_HISTORY = 20


@app.post("/api/chat")
async def chat(request: Request):
    body = await request.json()
    message = body.get("message", "").strip()
    visitor_id = request.headers.get("X-Visitor-Id", "anonymous")

    if not message:
        return {"error": "No message provided"}

    # Get or create conversation history for this visitor
    if visitor_id not in conversations:
        conversations[visitor_id] = []

    history = conversations[visitor_id]
    history.append({"role": "user", "content": message})

    # Trim history to prevent context overflow
    if len(history) > MAX_HISTORY:
        history = history[-MAX_HISTORY:]
        conversations[visitor_id] = history

    async def generate():
        try:
            full_response = ""
            with client.messages.stream(
                model="claude_haiku_4_5",
                max_tokens=300,
                system=CARL_SYSTEM_PROMPT,
                messages=history,
            ) as stream:
                for text in stream.text_stream:
                    full_response += text
                    yield f"data: {json.dumps({'text': text})}\n\n"

            # Store assistant response in history
            history.append({"role": "assistant", "content": full_response})
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@app.get("/api/health")
def health():
    return {"status": "ok", "character": "carl"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
