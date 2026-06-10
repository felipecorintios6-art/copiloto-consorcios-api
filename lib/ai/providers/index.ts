import type { AIProviderId } from "@/lib/types/ai";
import type { AIProvider } from "./types";
import { deepSeekProvider } from "./deepseek";
import { geminiProvider } from "./gemini";
import { openAIProvider } from "./openai";
import { openRouterProvider } from "./openrouter";

export const aiProviders: Record<AIProviderId, AIProvider> = {
  deepseek: deepSeekProvider,
  gemini: geminiProvider,
  openai: openAIProvider,
  openrouter: openRouterProvider
};

export function isAIProviderId(value: unknown): value is AIProviderId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(aiProviders, value)
  );
}
