import type { NextApiRequest, NextApiResponse } from "next";
import {
  getMemorySummary,
  SupabaseMemoryConfigError
} from "@/lib/memory/supabaseRest";

type HealthResponse = {
  ok: boolean;
  configured: boolean;
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ok: false,
      configured: false,
      message: "Metodo nao permitido."
    });
  }

  try {
    await getMemorySummary();

    return res.status(200).json({
      ok: true,
      configured: true,
      message: "Supabase configurado e acessivel."
    });
  } catch (error) {
    if (error instanceof SupabaseMemoryConfigError) {
      return res.status(503).json({
        ok: false,
        configured: false,
        message: error.message
      });
    }

    return res.status(502).json({
      ok: false,
      configured: true,
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel acessar o Supabase."
    });
  }
}
