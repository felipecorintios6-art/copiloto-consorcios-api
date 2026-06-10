import { generateAIResponse } from "@/lib/ai";
import { consortiumSalesSystemPrompt } from "@/lib/prompts/consortiumSalesPrompt";
import type { AIProviderId } from "@/lib/types/ai";
import type {
  SuggestResponseRequest,
  SuggestResponseResult
} from "@/lib/types/consorcios";
import { parseJSONObject } from "@/lib/utils/json";
import { normalizeSuggestResponseResult } from "@/lib/utils/validation";

function buildAgentInput(input: SuggestResponseRequest): string {
  return JSON.stringify(
    {
      company: input.company,
      lead: input.lead,
      conversation: input.conversation,
      task:
        "Analise a conversa e gere uma sugestao curta para o consultor comercial."
    },
    null,
    2
  );
}

export async function suggestConsortiumResponse(
  input: SuggestResponseRequest,
  options?: {
    provider?: AIProviderId;
    model?: string;
  }
): Promise<SuggestResponseResult> {
  const response = await generateAIResponse({
    provider: options?.provider,
    model: options?.model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: consortiumSalesSystemPrompt
      },
      {
        role: "user",
        content: buildAgentInput(input)
      }
    ]
  });

  const parsed = parseJSONObject<Partial<SuggestResponseResult>>(
    response.content
  );

  return normalizeSuggestResponseResult(parsed);
}
