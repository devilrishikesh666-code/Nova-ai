
require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.AI_API_KEY;

const BASE_URL = (
  process.env.AI_API_BASE_URL ||
  "https://openrouter.ai/api/v1"
).replace(/\/+$/, "");

const MODEL =
  process.env.AI_MODEL || "google/gemini-4-neon";

const SYSTEM_PROMPT = `
You are NOVA, an advanced AI assistant created by
Rishikesh Singh.

PERSONALITY:
- Intelligent, friendly and professional.
- Helpful and creative.
- Excellent at coding and programming.
- Explain difficult concepts simply.
- Write complete code when requested.
- Help with education, science, technology and creativity.
- Never pretend to perform actions you cannot perform.
- Identify yourself as NOVA when asked.

Your purpose is to help users learn, create and solve problems.
`;

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(express.json({ limit: "1mb" }));

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    agent: "NOVA",
    provider: "OpenRouter",
    model: MODEL
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({
        error: "OpenRouter API key is not configured."
      });
    }

    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Please provide valid messages."
      });
    }

    if (messages.length > 30) {
      return res.status(400).json({
        error: "Conversation limit reached. Start a new chat."
      });
    }

    const cleanMessages = messages.map((message) => {
      if (
        !message ||
        !["user", "assistant"].includes(message.role) ||
        typeof message.content !== "string" ||
        !message.content.trim()
      ) {
        throw new Error("Invalid message format.");
      }

      return {
        role: message.role,
        content: message.content.slice(0, 12000)
      };
    });

    const response = await fetch(
      `${BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "X-OpenRouter-Title": "NOVA AGENT",
          ...(process.env.SITE_URL
            ? { "HTTP-Referer": process.env.SITE_URL }
            : {})
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT
            },
            ...cleanMessages
          ],
          temperature: 0.7,
          max_tokens: 3000,
          stream: false
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter error:", data);

      return res.status(response.status).json({
        error:
          data.error?.message ||
          "OpenRouter request failed."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "NOVA received an empty response."
      });
    }

    return res.json({
      reply,
      model: data.model || MODEL,
      provider: "OpenRouter"
    });

  } catch (error) {
    console.error("NOVA server error:", error);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("================================");
  console.log("       NOVA AGENT ONLINE");
  console.log("================================");
  console.log("Provider: OpenRouter");
  console.log("Model:", MODEL);
  console.log("Port:", PORT);
});
