const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Frontend serve karo — correct path
app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running!", timestamp: new Date().toISOString() });
});

app.post("/api/generate-blog", async (req, res) => {
  const { topic, tone, length, keywords } = req.body;

  if (!topic) {
    return res.status(400).json({ error: "Topic is required!" });
  }

  const toneMap = {
    professional: "formal and professional",
    casual: "friendly and conversational",
    educational: "informative and educational",
    creative: "creative and engaging",
  };
  const lengthMap = {
    short: "300-400 words",
    medium: "600-800 words",
    long: "1000-1200 words",
  };

  const selectedTone = toneMap[tone] || "informative and engaging";
  const selectedLength = lengthMap[length] || "600-800 words";
  const keywordText = keywords ? `Include these keywords naturally: ${keywords}.` : "";

  const prompt = `Write a high-quality blog post about: "${topic}"
- Tone: ${selectedTone}
- Length: approximately ${selectedLength}
- ${keywordText}
- Start with a compelling title using ##
- Use ### for subheadings
- End with conclusion and call-to-action
- Use proper markdown formatting
Write the complete blog post now:`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq Error:", data);
      if (response.status === 401) return res.status(401).json({ error: "Invalid Groq API Key!" });
      if (response.status === 429) return res.status(429).json({ error: "Rate limit. Thoda ruko." });
      return res.status(500).json({ error: data.error?.message || "Groq API error" });
    }

    const blogContent = data.choices[0].message.content;

    res.json({
      success: true,
      blog: blogContent,
      topic: topic,
      generatedAt: new Date().toISOString(),
      wordCount: blogContent.split(" ").length,
    });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

// Baaki sab routes frontend pe bhejo
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server Running → http://localhost:${PORT}`);
  console.log(`🔑 Groq Key: ${process.env.GROQ_API_KEY ? "✅ Loaded" : "❌ Missing!"}\n`);
});