import type { AIProvider } from "./types";

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: unknown;
};

function parseOpenRouterResponse(text: string): OpenRouterChatResponse {
  try {
    return JSON.parse(text) as OpenRouterChatResponse;
  } catch {
    return {
      error: text
    };
  }
}

function formatOpenRouterError(error: unknown): string {
  if (!error) {
    return "Erro ao chamar OpenRouter.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return JSON.stringify(error);
}

export const openRouterProvider: AIProvider = {
  id: "openrouter",
  defaultModel: "openrouter/free",
  async generateText({ messages, model }) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY nao configurada.");
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://copiloto-consorcios-api.vercel.app",
          "X-Title": "Copiloto Consórcios API"
        },
        body: JSON.stringify({
          model,
          messages
        })
      }
    );

    const data = parseOpenRouterResponse(await response.text());

    if (!response.ok) {
      throw new Error(formatOpenRouterError(data.error));
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("OpenRouter retornou uma resposta vazia.");
    }

    return content;
  }
};
