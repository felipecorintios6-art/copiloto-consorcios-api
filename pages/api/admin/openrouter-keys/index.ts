import type { NextApiRequest, NextApiResponse } from "next";
import {
  createOpenRouterKey,
  listOpenRouterKeys
} from "@/lib/openrouter/capacityManager";
import type { OpenRouterKeyPublic } from "@/lib/types/openrouterCapacity";

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OpenRouterKeyPublic[] | OpenRouterKeyPublic | ErrorResponse>
) {
  try {
    if (req.method === "GET") {
      return res.status(200).json(await listOpenRouterKeys());
    }

    if (req.method === "POST") {
      return res.status(201).json(await createOpenRouterKey(req.body));
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Metodo nao permitido." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro administrativo OpenRouter.";

    return res.status(400).json({ error: message });
  }
}
