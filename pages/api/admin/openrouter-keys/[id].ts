import type { NextApiRequest, NextApiResponse } from "next";
import {
  deleteOpenRouterKey,
  updateOpenRouterKey
} from "@/lib/openrouter/capacityManager";
import type { OpenRouterKeyPublic } from "@/lib/types/openrouterCapacity";

type ErrorResponse = {
  error: string;
};

function getId(req: NextApiRequest) {
  const id = req.query.id;

  if (Array.isArray(id)) {
    return id[0];
  }

  return id;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OpenRouterKeyPublic | { ok: true } | ErrorResponse>
) {
  const id = getId(req);

  if (!id) {
    return res.status(400).json({ error: "ID da chave nao informado." });
  }

  try {
    if (req.method === "PATCH") {
      return res.status(200).json(await updateOpenRouterKey(id, req.body));
    }

    if (req.method === "DELETE") {
      await deleteOpenRouterKey(id);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "PATCH, DELETE");
    return res.status(405).json({ error: "Metodo nao permitido." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro administrativo OpenRouter.";

    return res.status(400).json({ error: message });
  }
}
