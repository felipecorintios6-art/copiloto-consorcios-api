import type { NextApiRequest, NextApiResponse } from "next";
import { suggestConsortiumResponse } from "@/lib/agents/consortiumSalesAgent";
import { isAIProviderId } from "@/lib/ai";
import type { SuggestResponseResult } from "@/lib/types/consorcios";
import { validateSuggestResponseRequest } from "@/lib/utils/validation";

type ErrorResponse = {
  error: string;
};

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
    const providerParam = Array.isArray(req.query.provider)
      ? req.query.provider[0]
      : req.query.provider;
    const headerProvider = req.headers["x-ai-provider"];
    const providerCandidate =
      providerParam ??
      (Array.isArray(headerProvider) ? headerProvider[0] : headerProvider);

    const result = await suggestConsortiumResponse(payload, {
      provider: isAIProviderId(providerCandidate) ? providerCandidate : undefined
    });

    return res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro inesperado ao sugerir resposta.";

    return res.status(400).json({ error: message });
  }
}
