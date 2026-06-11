import type { NextApiRequest, NextApiResponse } from "next";
import { suggestConsortiumResponse } from "@/lib/agents/consortiumSalesAgent";
import { isAIProviderId } from "@/lib/ai";
import { getOpenRouterModelById } from "@/lib/ai/openrouter-models";
import type { AIProviderId } from "@/lib/types/ai";
import type { SuggestResponseResult } from "@/lib/types/consorcios";
import { validateSuggestResponseRequest } from "@/lib/utils/validation";

type ErrorResponse = {
  error: string;
};

function getProviderCandidate(req: NextApiRequest): unknown {
  const body = req.body as { provider?: unknown };
  const providerParam = Array.isArray(req.query.provider)
    ? req.query.provider[0]
    : req.query.provider;
  const headerProvider = req.headers["x-ai-provider"];

  return (
    body.provider ??
    providerParam ??
    (Array.isArray(headerProvider) ? headerProvider[0] : headerProvider)
  );
}

function resolveProvider(value: unknown): AIProviderId | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (!isAIProviderId(value)) {
    throw new Error("Provider nao permitido.");
  }

  return value;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuggestResponseResult | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo nao permitido." });
  }

  try {
    const payload = validateSuggestResponseRequest(req.body);
    const provider = resolveProvider(getProviderCandidate(req));
    const body = req.body as { selected_model_id?: unknown };
    const selectedOpenRouterModel =
      provider === "openrouter"
        ? getOpenRouterModelById(body.selected_model_id)
        : undefined;

    if (provider === "openrouter" && !selectedOpenRouterModel) {
      throw new Error("Modelo OpenRouter nao permitido.");
    }

    const result = await suggestConsortiumResponse(payload, {
      provider,
      model: selectedOpenRouterModel?.model,
      aiUsed: selectedOpenRouterModel?.label
    });

    return res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro inesperado ao sugerir resposta.";

    return res.status(400).json({ error: message });
  }
}
