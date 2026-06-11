export const OPENROUTER_MODELS = [
  {
    id: "openrouter-auto",
    label: "OpenRouter Auto",
    model: "openrouter/free"
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    model: "deepseek/deepseek-chat-v3-0324:free"
  },
  {
    id: "qwen",
    label: "Qwen",
    model: "qwen/qwen3-235b-a22b:free"
  },
  {
    id: "llama",
    label: "Llama",
    model: "meta-llama/llama-3.3-70b-instruct:free"
  }
] as const;

export type OpenRouterModelId = (typeof OPENROUTER_MODELS)[number]["id"];

export function getOpenRouterModelById(id: unknown) {
  if (typeof id !== "string") {
    return OPENROUTER_MODELS[0];
  }

  return OPENROUTER_MODELS.find((model) => model.id === id) ?? null;
}
