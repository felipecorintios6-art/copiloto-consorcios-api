import type { NextApiRequest, NextApiResponse } from "next";
import { importConversationRecord } from "@/lib/memory/supabaseRest";
import type { ImportResult } from "@/lib/types/memory";
import {
  parseCSV,
  parseHistoricalMessages,
  parseJSONImport,
  toImportRecords,
  validateImportRecords
} from "@/lib/utils/importParser";

type ErrorResponse = {
  error: string;
  errors?: ImportResult["errors"];
};

type ImportBody = {
  records?: Record<string, unknown>[];
  csv?: string;
  json?: string;
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

function getRawRecords(body: ImportBody): Record<string, unknown>[] {
  if (Array.isArray(body.records)) {
    return body.records;
  }

  if (typeof body.csv === "string") {
    return parseCSV(body.csv);
  }

  if (typeof body.json === "string") {
    return parseJSONImport(body.json);
  }

  throw new Error("Envie records[], csv ou json.");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ImportResult | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo nao permitido." });
  }

  try {
    const records = toImportRecords(getRawRecords(req.body as ImportBody));
    const errors = validateImportRecords(records);

    if (errors.length > 0) {
      return res.status(400).json({
        error: "Importacao bloqueada por erros de validacao.",
        errors
      });
    }

    const result: ImportResult = {
      totalRecords: records.length,
      validRecords: records.length,
      errorCount: 0,
      errors: [],
      importedRecords: 0,
      companiesCreated: 0,
      leadsCreated: 0,
      conversationsCreated: 0,
      messagesCreated: 0
    };

    for (const record of records) {
      const imported = await importConversationRecord(
        record,
        parseHistoricalMessages(record.mensagens)
      );

      result.importedRecords += 1;
      result.companiesCreated += imported.companyCreated ? 1 : 0;
      result.leadsCreated += imported.leadCreated ? 1 : 0;
      result.conversationsCreated += imported.conversationCreated ? 1 : 0;
      result.messagesCreated += imported.messagesCreated;
    }

    return res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro inesperado na importacao.";

    return res.status(400).json({ error: message });
  }
}
