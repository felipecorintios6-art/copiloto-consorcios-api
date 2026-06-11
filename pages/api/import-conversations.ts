import type { NextApiRequest, NextApiResponse } from "next";

type ErrorResponse = {
  error: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo nao permitido." });
  }

  return res.status(410).json({
    error: "Importacao historica substituida por /api/memory/import-batch."
  });
}
