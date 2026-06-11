import {
  queueAIRequest,
  recordOpenRouterUsage,
  releaseOpenRouterKey,
  selectAvailableOpenRouterKey
} from "@/lib/openrouter/capacityManager";
import type { AIProvider } from "./types";

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
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

function hasSupabaseCapacityConfig() {
  return Boolean(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.ENCRYPTION_SECRET
  );
}

async function callOpenRouter(input: {
  apiKey: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  model: string;
}) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://copiloto-consorcios-api.vercel.app",
      "X-Title": "Copiloto Cons\u00f3rcios API"
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages
    })
  });
  const data = parseOpenRouterResponse(await response.text());

  return {
    response,
    data
  };
}

async function generateWithDirectOpenRouter(input: {
  messages: Array<{
    role: string;
    content: string;
  }>;
  model: string;
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Configure OPENROUTER_API_KEY para teste direto ou configure Supabase/ENCRYPTION_SECRET para usar o gerenciador de capacidade."
    );
  }

  const { response, data } = await callOpenRouter({
    apiKey,
    messages: input.messages,
    model: input.model
  });

  if (!response.ok) {
    throw new Error(formatOpenRouterError(data.error));
  }

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenRouter retornou uma resposta vazia.");
  }

  return content;
}

export const openRouterProvider: AIProvider = {
  id: "openrouter",
  defaultModel: "openrouter/free",
  async generateText({ messages, model }) {
    if (!hasSupabaseCapacityConfig()) {
      return generateWithDirectOpenRouter({
        messages,
        model
      });
    }

    const endpoint = "/api/suggest-response";
    const attemptedKeyIds = new Set<string>();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const selectedKey = await selectAvailableOpenRouterKey();

      if (!selectedKey || attemptedKeyIds.has(selectedKey.id)) {
        await queueAIRequest({
          endpoint,
          payload: {
            model,
            messages
          },
          lastError: "Nenhuma chave OpenRouter disponivel."
        });
        await recordOpenRouterUsage({
          keyId: null,
          endpoint,
          status: "queued",
          errorMessage: "Nenhuma chave disponivel no momento."
        });
        throw new Error(
          "Nenhuma chave dispon\u00edvel no momento. A requisi\u00e7\u00e3o foi colocada em fila."
        );
      }

      attemptedKeyIds.add(selectedKey.id);

      try {
        const { response, data } = await callOpenRouter({
          apiKey: selectedKey.apiKey,
          messages,
          model
        });

        if (!response.ok) {
          const errorMessage = formatOpenRouterError(data.error);
          const rateLimited =
            response.status === 429 || /rate|limit/i.test(errorMessage);

          await recordOpenRouterUsage({
            keyId: selectedKey.id,
            tenantId: selectedKey.tenant_id,
            endpoint,
            status: "error",
            errorCode: String(response.status),
            errorMessage,
            rateLimited
          });

          if (rateLimited) {
            continue;
          }

          throw new Error(errorMessage);
        }

        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error("OpenRouter retornou uma resposta vazia.");
        }

        await recordOpenRouterUsage({
          keyId: selectedKey.id,
          tenantId: selectedKey.tenant_id,
          endpoint,
          status: "success",
          tokensInput: data.usage?.prompt_tokens ?? null,
          tokensOutput: data.usage?.completion_tokens ?? null
        });

        return content;
      } finally {
        await releaseOpenRouterKey(selectedKey.id);
      }
    }

    await queueAIRequest({
      endpoint,
      payload: {
        model,
        messages
      },
      lastError: "Todas as chaves OpenRouter tentadas entraram em limite."
    });
    await recordOpenRouterUsage({
      keyId: null,
      endpoint,
      status: "queued",
      errorMessage: "Todas as chaves OpenRouter tentadas entraram em limite."
    });

    throw new Error(
      "Nenhuma chave dispon\u00edvel no momento. A requisi\u00e7\u00e3o foi colocada em fila."
    );
  }
};
