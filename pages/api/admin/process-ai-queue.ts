import type { NextApiRequest, NextApiResponse } from "next";
import { processOpenRouterQueue } from "@/lib/openrouter/capacityManager";
import type { ProcessQueueResult } from "@/lib/types/openrouterCapacity";

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProcessQueueResult | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo nao permitido." });
  }

  try {
    const limit = Number(req.query.limit ?? 5);
    const result = await processOpenRouterQueue(
      Number.isFinite(limit) ? limit : 5
    );

    return res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao processar fila.";

    return res.status(400).json({ error: message });
  }
}
