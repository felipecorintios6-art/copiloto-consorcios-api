import type {
  AIMessage,
  AIProviderId,
  GenerateAIResponseInput
} from "@/lib/types/ai";

export type ProviderRequest = Omit<GenerateAIResponseInput, "provider"> & {
  model: string;
  messages: AIMessage[];
};

export type AIProvider = {
  id: AIProviderId;
  defaultModel: string;
  generateText(input: ProviderRequest): Promise<string>;
};
