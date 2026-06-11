import type { NextApiRequest, NextApiResponse } from "next";
import {
  SupabaseMemoryConfigError,
  upsertConversation
} from "@/lib/memory/supabaseRest";
import type { ConversationInput } from "@/lib/types/memory";

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
    const result = await upsertConversation(req.body as ConversationInput);
    return res.status(200).json({
      id: result.row.id,
      created: result.created
    });
  } catch (error) {
    if (error instanceof SupabaseMemoryConfigError) {
      return res.status(503).json({ error: error.message });
    }

    const message =
      error instanceof Error ? error.message : "Erro ao importar conversa.";

    return res.status(400).json({ error: message });
  }
}
