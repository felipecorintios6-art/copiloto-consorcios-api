export type AIProviderId = "deepseek" | "gemini" | "openai" | "openrouter";

export type AIRole = "system" | "user" | "assistant";

export type AIMessage = {
  role: AIRole;
  content: string;
};

export type GenerateAIResponseInput = {
  messages: AIMessage[];
  model?: string;
  provider?: AIProviderId;
  temperature?: number;
};

export type GenerateAIResponseResult = {
  content: string;
  provider: AIProviderId;
  model: string;
};
