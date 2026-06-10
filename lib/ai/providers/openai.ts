import type { AIProvider } from "./types";

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export const openAIProvider: AIProvider = {
  id: "openai",
  defaultModel: "gpt-4.1-mini",
  async generateText({ messages, model, temperature }) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY nao configurada.");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature ?? 0.3
      })
    });

    const data = (await response.json()) as OpenAIChatResponse;

    if (!response.ok) {
      throw new Error(data.error?.message ?? "Erro ao chamar OpenAI.");
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("OpenAI retornou uma resposta vazia.");
    }

    return content;
  }
};
