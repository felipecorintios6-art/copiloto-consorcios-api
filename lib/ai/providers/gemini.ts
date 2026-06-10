import type { AIMessage } from "@/lib/types/ai";
import type { AIProvider } from "./types";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

function toGeminiContents(messages: AIMessage[]) {
  const systemMessages = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");

  const conversationMessages = messages.filter(
    (message) => message.role !== "system"
  );

  return [
    ...(systemMessages
      ? [
          {
            role: "user",
            parts: [{ text: systemMessages }]
          },
          {
            role: "model",
            parts: [{ text: "Entendido." }]
          }
        ]
      : []),
    ...conversationMessages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }]
    }))
  ];
}

export const geminiProvider: AIProvider = {
  id: "gemini",
  defaultModel: "gemini-1.5-flash",
  async generateText({ messages, model, temperature }) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY nao configurada.");
    }

    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    );
    url.searchParams.set("key", apiKey);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: toGeminiContents(messages),
        generationConfig: {
          temperature: temperature ?? 0.3
        }
      })
    });

    const data = (await response.json()) as GeminiResponse;

    if (!response.ok) {
      throw new Error(data.error?.message ?? "Erro ao chamar Gemini.");
    }

    const content = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("");

    if (!content) {
      throw new Error("Gemini retornou uma resposta vazia.");
    }

    return content;
  }
};
