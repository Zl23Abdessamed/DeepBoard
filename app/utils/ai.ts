"use server";

import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { OpenRouter } from "@openrouter/sdk";
import Cerebras from "@cerebras/cerebras_cloud_sdk";

// ---------- Initialize clients (server-side only) ----------
const geminiKey = process.env.GEMINI_API_KEY;
const groqKey = process.env.GROQ_API_KEY;
const openrouterKey = process.env.OPENROUTER_API_KEY;
const cerebrasKey = process.env.CEREBRAS_API_KEY;

const geminiClient = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;
const groqClient = groqKey ? new Groq({ apiKey: groqKey }) : null;
const openrouterClient = openrouterKey
  ? new OpenRouter({ apiKey: openrouterKey })
  : null;
const cerebrasClient = cerebrasKey
  ? new Cerebras({ apiKey: cerebrasKey })
  : null;

// ---------- Individual model actions ----------
export async function generateGeminiText(
  prompt: string,
  modelName = "gemini-2.5-flash"
): Promise<string> {
  if (!geminiClient) throw new Error("Gemini client is not configured.");
  try {
    const response = await geminiClient.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return response.text || "";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Gemini failed to generate a response.");
  }
}

export async function generateGroqText(
  prompt: string,
  modelName = "llama-3.3-70b-versatile"
): Promise<string> {
  if (!groqClient) throw new Error("Groq client is not configured.");
  try {
    const response = await groqClient.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: modelName,
    });
    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Groq Error:", error);
    throw new Error("Groq failed to generate a response.");
  }
}

export async function generateOpenRouterText(
  prompt: string,
  modelName = "openrouter/free"
): Promise<string> {
  if (!openrouterClient) throw new Error("OpenRouter client is not configured.");
  try {
    const completion = await openrouterClient.chat.send({
      chatRequest: {
        model: modelName,
        messages: [{ role: "user", content: prompt }],
      },
    });
    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("OpenRouter Error:", error);
    throw new Error("OpenRouter failed to generate a response.");
  }
}

export async function generateCerebrasText(
  prompt: string,
  modelName = "llama-3.3-70b"
): Promise<string> {
  if (!cerebrasClient) throw new Error("Cerebras client is not configured.");
  try {
    const response = (await cerebrasClient.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: modelName,
    })) as any;
    return response.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("Cerebras Error:", error);
    throw new Error("Cerebras failed to generate a response.");
  }
}