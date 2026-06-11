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
        "Analise a conversa e gere uma sugestao curta para o consultor comercial. Retorne apenas JSON valido, sem markdown e sem texto antes ou depois."
    },
    null,
    2
  );
}

function cleanSuggestionFallback(content: string): string {
  return content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()
    .slice(0, 800);
}

export async function suggestConsortiumResponse(
  input: SuggestResponseRequest,
  options?: {
    provider?: AIProviderId;
    model?: string;
    aiUsed?: string;
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

  try {
    const parsed = parseJSONObject<Partial<SuggestResponseResult>>(
      response.content
    );

    return {
      provider: response.provider,
      ai_used: options?.aiUsed ?? response.provider,
      model_used: response.model,
      ...normalizeSuggestResponseResult(parsed)
    };
  } catch {
    return {
      provider: response.provider,
      ai_used: options?.aiUsed ?? response.provider,
      model_used: response.model,
      ...normalizeSuggestResponseResult({
        suggestion: cleanSuggestionFallback(response.content),
        lead_temperature: "",
        detected_objection: "",
        next_action: "Revisar a sugestao antes de enviar ao lead."
      })
    };
  }
}
