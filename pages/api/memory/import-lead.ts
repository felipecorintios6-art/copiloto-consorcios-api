import type { NextApiRequest, NextApiResponse } from "next";
import { upsertLead } from "@/lib/memory/supabaseRest";
import type { LeadInput } from "@/lib/types/memory";

type ResponseBody =
  | { id: string; created: boolean }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo nao permitido." });
  }

  try {
    const result = await upsertLead(req.body as LeadInput);
    return res.status(200).json({
      id: result.row.id,
      created: result.created
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao importar lead.";

    return res.status(400).json({ error: message });
  }
}
