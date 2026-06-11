import type { NextApiRequest, NextApiResponse } from "next";
import {
  importBatch,
  SupabaseMemoryConfigError
} from "@/lib/memory/supabaseRest";
import type { ImportBatchInput, ImportBatchResult } from "@/lib/types/memory";

type ResponseBody =
  | { success: true; imported: ImportBatchResult }
  | { error: string };

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo nao permitido." });
  }

  try {
    const imported = await importBatch(req.body as ImportBatchInput);
    return res.status(200).json({
      success: true,
      imported
    });
  } catch (error) {
    if (error instanceof SupabaseMemoryConfigError) {
      return res.status(503).json({ error: error.message });
    }

    const message =
      error instanceof Error ? error.message : "Erro ao importar lote.";

    return res.status(400).json({ error: message });
  }
}
