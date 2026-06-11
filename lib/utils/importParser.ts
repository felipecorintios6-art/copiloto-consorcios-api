import type {
  ImportConversationRecord,
  ImportValidationError,
  ParsedHistoricalMessage
} from "@/lib/types/memory";

export const importColumns = [
  "empresa_nome",
  "lead_nome",
  "lead_telefone",
  "consultor_nome",
  "categoria_interesse",
  "valor_credito",
  "valor_entrada",
  "cidade_lead",
  "origem_lead",
  "status_lead",
  "resultado_final",
  "mensagens"
] as const;

const requiredColumns = [
  "empresa_nome",
  "lead_nome",
  "mensagens"
] as const;

type ImportColumn = (typeof importColumns)[number];

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

export function normalizeImportRecord(
  value: Record<string, unknown>
): ImportConversationRecord {
  return importColumns.reduce((record, column) => {
    record[column] = normalizeValue(value[column]);
    return record;
  }, {} as ImportConversationRecord);
}

export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && next === '"' && inQuotes) {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  const [headers = [], ...dataRows] = rows.filter((items) =>
    items.some((item) => item.trim())
  );
  const normalizedHeaders = headers.map((header) => header.trim());

  return dataRows.map((items) =>
    normalizedHeaders.reduce<Record<string, string>>((record, header, index) => {
      record[header] = items[index]?.trim() ?? "";
      return record;
    }, {})
  );
}

export function parseJSONImport(text: string): Record<string, unknown>[] {
  const data = JSON.parse(text) as unknown;

  if (Array.isArray(data)) {
    return data as Record<string, unknown>[];
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "records" in data &&
    Array.isArray(data.records)
  ) {
    return data.records as Record<string, unknown>[];
  }

  throw new Error("JSON deve ser uma lista de registros ou conter records[].");
}

export function parseHistoricalMessages(text: string): ParsedHistoricalMessage[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const match = line.match(
      /^\[(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})\]\s*([^:]+):\s*(.+)$/
    );

    if (!match) {
      return {
        created_at: new Date().toISOString(),
        sender: "desconhecido",
        message: line
      };
    }

    const [, day, month, year, hour, minute, sender, message] = match;
    const createdAt = new Date(
      `${year}-${month}-${day}T${hour}:${minute}:00-03:00`
    );

    return {
      created_at: createdAt.toISOString(),
      sender: sender.trim().toLowerCase(),
      message: message.trim()
    };
  });
}

export function getInvalidHistoricalMessageLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/^\[(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})\]\s*([^:]+):\s*(.+)$/.test(
          line
        )
    );
}

export function validateImportRecords(
  records: ImportConversationRecord[]
): ImportValidationError[] {
  const errors: ImportValidationError[] = [];

  records.forEach((record, index) => {
    const row = index + 1;

    requiredColumns.forEach((column) => {
      if (!record[column]) {
        errors.push({
          row,
          field: column,
          message: "Campo obrigatorio vazio."
        });
      }
    });

    const parsedMessages = parseHistoricalMessages(record.mensagens);
    const invalidMessageLines = getInvalidHistoricalMessageLines(record.mensagens);

    if (record.mensagens && parsedMessages.length === 0) {
      errors.push({
        row,
        field: "mensagens",
        message: "Nenhuma mensagem encontrada."
      });
    }

    if (invalidMessageLines.length > 0) {
      errors.push({
        row,
        field: "mensagens",
        message:
          "Existe mensagem fora do formato [dd/mm/aaaa hh:mm] Remetente: texto."
      });
    }
  });

  return errors;
}

export function getUnknownColumns(record: Record<string, unknown>): string[] {
  const knownColumns = new Set<string>(importColumns);

  return Object.keys(record).filter((key) => !knownColumns.has(key));
}

export function toImportRecords(
  records: Record<string, unknown>[]
): ImportConversationRecord[] {
  return records.map(normalizeImportRecord);
}

export function hasImportColumn(value: string): value is ImportColumn {
  return importColumns.includes(value as ImportColumn);
}
