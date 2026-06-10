import {
  aiProviders,
  isAIProviderId
} from "@/lib/ai/providers";
import type {
  AIProviderId,
  GenerateAIResponseInput,
  GenerateAIResponseResult
} from "@/lib/types/ai";

function resolveProvider(provider?: AIProviderId): AIProviderId {
  if (provider) {
    return provider;
  }

  const configuredProvider = process.env.AI_PROVIDER?.toLowerCase();

  if (isAIProviderId(configuredProvider)) {
    return configuredProvider;
  }

  return "openai";
}

export async function generateAIResponse(
  input: GenerateAIResponseInput
): Promise<GenerateAIResponseResult> {
  const providerId = resolveProvider(input.provider);
  const provider = aiProviders[providerId];
  const model = input.model ?? process.env.AI_MODEL ?? provider.defaultModel;

  const content = await provider.generateText({
    messages: input.messages,
    model,
    temperature: input.temperature
  });

  return {
    content,
    provider: providerId,
    model
  };
}
