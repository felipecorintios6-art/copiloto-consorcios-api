import type { NextApiRequest, NextApiResponse } from "next";
import { getMemorySummary } from "@/lib/memory/supabaseRest";
import type { MemorySummary } from "@/lib/types/memory";

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MemorySummary | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Metodo nao permitido." });
  }

  try {
    const summary = await getMemorySummary();
    return res.status(200).json(summary);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao carregar memoria.";

    return res.status(400).json({ error: message });
  }
}
