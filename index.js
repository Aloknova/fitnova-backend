import 'dotenv/config';
import express from "express";
import cors from "cors";
import { z } from "zod";

const app = express();
app.use(cors());
app.use(express.json());

// --- AI Schemas ---
const chatSchema = z.object({
  provider: z.enum(['groq']).default('groq'),
  userId: z.string().optional(),
  message: z.string().min(1),
  memory: z.array(z.string()).default([]),
  profile: z.object({
    goal: z.string().optional(),
    fitness_goal: z.string().optional(),
    age: z.number().int().positive().optional(),
    gender: z.string().optional(),
    weight_kg: z.number().optional(),
    height_cm: z.number().optional(),
    activity_level: z.string().optional(),
  }).passthrough().default({}),
});

const dietSchema = z.object({
  userId: z.string().optional(),
  profile: z.object({
    goal: z.string().optional(),
    fitness_goal: z.string().optional(),
    age: z.number().int().positive().optional(),
    gender: z.string().optional(),
    weight_kg: z.number().optional(),
    height_cm: z.number().optional(),
    activity_level: z.string().optional(),
  }).passthrough().default({}),
});

// --- Routes ---

app.get("/", (req, res) => {
  res.send("FitNova backend running 🚀");
});

app.get("/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// AI Chat Route
app.post("/api/ai/chat", async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
  }

  const start = Date.now();
  const { provider, message, memory, profile } = parsed.data;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'Groq API key not configured' });

  try {
    const systemPrompt = [
      'You are the FitNova smart fitness and life assistant.',
      'Return JSON only with fields: intent, summary, actions, warnings.',
      'IMPORTANT: All meal and diet suggestions MUST be 100% vegetarian.',
      'User profile: ' + JSON.stringify(profile),
    ].join(' ');

    const payload = {
      model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);

    res.json({
      ...content,
      latency_ms: Date.now() - start,
    });
  } catch (error) {
    res.status(500).json({ error: 'AI request failed', details: String(error) });
  }
});

// Diet Plan Route
app.post("/api/ai/diet-plan", async (req, res) => {
  const parsed = dietSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const start = Date.now();
  const { profile } = parsed.data;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'Groq API key not configured' });

  try {
    const systemPrompt = [
      'You are a professional nutrition coach.',
      'Generate a 100% vegetarian daily meal plan.',
      'Return JSON ONLY.',
      'Structure: {"title": "...", "calorie_target": 2000, "protein_g": 150, "carbs_g": 200, "fat_g": 60, "meals": [{"type": "Breakfast", "food": "...", "calories": 500, "protein_g": 30}, ...]}',
      'Profile: ' + JSON.stringify(profile),
    ].join(' ');

    const payload = {
      model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate my daily vegetarian diet plan.' },
      ],
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const plan = JSON.parse(data.choices[0].message.content);

    res.json({
      ...plan,
      latency_ms: Date.now() - start,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate diet plan', details: String(error) });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`FitNova full backend listening on port ${PORT}`);
});
