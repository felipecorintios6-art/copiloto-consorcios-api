import type { AIProvider } from "./types";

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export const deepSeekProvider: AIProvider = {
  id: "deepseek",
  defaultModel: "deepseek-chat",
  async generateText({ messages, model, temperature }) {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY nao configurada.");
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
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

    const data = (await response.json()) as DeepSeekChatResponse;

    if (!response.ok) {
      throw new Error(data.error?.message ?? "Erro ao chamar DeepSeek.");
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("DeepSeek retornou uma resposta vazia.");
    }

    return content;
  }
};
