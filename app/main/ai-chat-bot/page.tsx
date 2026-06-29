"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSend, FiUser, FiCpu, FiAlertCircle } from "react-icons/fi";
import { generateGeminiText, generateGroqText, generateOpenRouterText, generateCerebrasText } from "@/app/utils/ai";

type Message = {
  role: "user" | "assistant";
  content: string;
  model?: string; // which model produced the answer
};

const SYSTEM_PROMPT = `You are a chess expert AI. You ONLY answer questions related to chess. If the user asks something outside chess, politely decline and remind them you can only help with chess.

For every chess question:
1. Give a very brief introduction (1-2 sentences).
2. Explain the concept clearly and thoroughly.
3. End with a small, concrete example.

Keep your answers concise but informative.`;

// The fallback chain in order
const FALLBACK_MODELS = [
  { name: "Gemini 2.5 Flash", generate: generateGeminiText },
  { name: "Llama 3.3 70B (Groq)", generate: generateGroqText },
  { name: "OpenRouter (Free)", generate: generateOpenRouterText },
  { name: "Llama 3.3 70B (Cerebras)", generate: generateCerebrasText },
];

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setError(null);
    setLoading(true);

    // Build conversation history as a single string
    const conversationHistory = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role,
          content: m.content,
        })),
      { role: "user", content: trimmed },
    ];

    const conversationText = conversationHistory
      .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
      .join("\n\n");

    let lastError: string | null = null;

    // Try models in sequence until one succeeds
    for (const model of FALLBACK_MODELS) {
      try {
        const responseText = await model.generate(conversationText);
        const assistantMsg: Message = {
          role: "assistant",
          content: responseText,
          model: model.name,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setLoading(false);
        return; // Success – exit early
      } catch (err: any) {
        console.warn(`Model ${model.name} failed:`, err.message);
        lastError = err.message || "Unknown error";
        // Continue to next model
      }
    }

    // If we reach here, all models failed
    setError(
      `All AI models failed. Last error: ${lastError}. Please try again later.`
    );
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-black text-white min-h-screen p-6 overflow-hidden relative">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF4D00]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FF0000]/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent">
            AI Chess Coach
          </h1>
          <p className="text-orange-200/70 text-sm mt-1">
            Ask any chess question – openings, tactics, strategy, endgames
          </p>
          <p className="text-orange-300/60 text-xs mt-1">
            The system automatically selects the best available AI model.
          </p>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
          {messages.length === 0 && !loading && (
            <div className="text-center text-orange-200/50 py-10">
              Ask a chess question to get started.
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-[#FF4D00] to-[#FF0000] text-white"
                      : "bg-black/40 border border-[#FF4D00]/30 text-orange-100"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {msg.role === "user" ? (
                      <FiUser className="text-white text-xs" />
                    ) : (
                      <FiCpu className="text-[#FF4D00] text-xs" />
                    )}
                    <span className="text-xs opacity-70">
                      {msg.role === "user" ? "You" : msg.model || "AI"}
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-black/40 border border-[#FF4D00]/30 rounded-2xl px-4 py-3 max-w-[75%]">
                <div className="flex items-center gap-2 mb-1">
                  <FiCpu className="text-[#FF4D00] text-xs" />
                  <span className="text-xs text-orange-200/70">AI Thinking...</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce [animation-delay:0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-sm"
            >
              <FiAlertCircle />
              {error}
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a chess question..."
            rows={2}
            className="flex-1 bg-black/40 border border-[#FF4D00]/30 rounded-xl px-4 py-3 text-orange-100 placeholder-orange-200/40 text-sm resize-none focus:outline-none focus:border-[#FF4D00]"
            disabled={loading}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 bg-gradient-to-r from-[#FF4D00] to-[#FF0000] rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <FiSend />
          </motion.button>
        </div>
      </div>
    </div>
  );
}