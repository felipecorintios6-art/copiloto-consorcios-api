import type {
  CompanyInput,
  ConversationInput,
  ConversationResultInput,
  ImportBatchInput,
  ImportBatchResult,
  LeadInput,
  MemorySummary,
  MessageInput
} from "@/lib/types/memory";

type SupabaseRow = Record<string, unknown>;

type CompanyRow = {
  id: string;
  external_id: string;
  name: string;
  created_at: string;
};

type LeadRow = {
  id: string;
  external_id: string;
  company_id: string;
  name: string | null;
};

type ConversationRow = {
  id: string;
  external_id: string;
  company_id: string;
  lead_id: string;
};

type MessageRow = {
  id: string;
  external_id: string;
  conversation_id: string;
};

export class SupabaseMemoryConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseMemoryConfigError";
  }
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new SupabaseMemoryConfigError(
      "Supabase nao configurado. Configure SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL."
    );
  }

  if (!serviceRoleKey) {
    throw new SupabaseMemoryConfigError(
      "Supabase nao configurado. Configure SUPABASE_SERVICE_ROLE_KEY no ambiente do servidor."
    );
  }

  return {
    url: url.replace(/\/$/, ""),
    serviceRoleKey
  };
}

async function supabaseRequest<T>(
  path: string,
  init: Omit<RequestInit, "headers"> & {
    headers?: Record<string, string>;
    prefer?: string;
  } = {}
): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {}),
      ...init.headers
    }
  });

  const text = await response.text();
  const data = text ? parseSupabaseJSON(text) : null;

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : text;

    throw new Error(message || "Erro ao acessar Supabase.");
  }

  return data as T;
}

function parseSupabaseJSON(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function encodeFilter(value: string) {
  return encodeURIComponent(value);
}

function firstReturnedRow<T>(rows: T[], operation: string): T {
  const row = rows[0];

  if (!row) {
    throw new Error(`Supabase nao retornou dados em ${operation}.`);
  }

  return row;
}

function requireExternalId(value: unknown, entity: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${entity}.external_id e obrigatorio.`);
  }

  return value.trim();
}

function normalizeText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeNumberText(value: unknown): string | number | null {
  if (typeof value === "number") {
    return value;
  }

  return normalizeText(value);
}

async function getByExternalId<T>(
  table: string,
  externalId: string,
  select = "*"
): Promise<T | null> {
  const rows = await supabaseRequest<T[]>(
    `${table}?external_id=eq.${encodeFilter(externalId)}&select=${select}&limit=1`
  );

  return rows[0] ?? null;
}

async function upsertByExternalId<T>(
  table: string,
  payload: SupabaseRow,
  operation: string
): Promise<{ row: T; created: boolean }> {
  const externalId = String(payload.external_id);
  const existing = await getByExternalId<T>(table, externalId, "id");
  const rows = await supabaseRequest<T[]>(`${table}?on_conflict=external_id&select=*`, {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify(payload)
  });

  return {
    row: firstReturnedRow(rows, operation),
    created: !existing
  };
}

export async function upsertCompany(company: CompanyInput) {
  const externalId = requireExternalId(company.external_id, "company");
  const name = normalizeText(company.name);

  if (!name) {
    throw new Error("company.name e obrigatorio.");
  }

  return upsertByExternalId<CompanyRow>(
    "companies",
    {
      external_id: externalId,
      name
    },
    "upsertCompany"
  );
}

export async function upsertLead(lead: LeadInput, companyId?: string) {
  const externalId = requireExternalId(lead.external_id, "lead");
  const resolvedCompanyId = companyId ?? normalizeText(lead.company_id);

  if (!resolvedCompanyId) {
    throw new Error("lead.company_id e obrigatorio.");
  }

  return upsertByExternalId<LeadRow>(
    "leads",
    {
      external_id: externalId,
      company_id: resolvedCompanyId,
      name: normalizeText(lead.name),
      phone: normalizeText(lead.phone),
      city: normalizeText(lead.city),
      state: normalizeText(lead.state),
      source: normalizeText(lead.source),
      category: normalizeText(lead.category),
      credit_value: normalizeNumberText(lead.credit_value),
      entry_value: normalizeNumberText(lead.entry_value),
      status: normalizeText(lead.status)
    },
    "upsertLead"
  );
}

export async function upsertConversation(
  conversation: ConversationInput,
  companyId?: string,
  leadId?: string
) {
  const externalId = requireExternalId(conversation.external_id, "conversation");
  const resolvedCompanyId = companyId ?? normalizeText(conversation.company_id);
  const resolvedLeadId = leadId ?? normalizeText(conversation.lead_id);

  if (!resolvedCompanyId) {
    throw new Error("conversation.company_id e obrigatorio.");
  }

  if (!resolvedLeadId) {
    throw new Error("conversation.lead_id e obrigatorio.");
  }

  return upsertByExternalId<ConversationRow>(
    "conversations",
    {
      external_id: externalId,
      company_id: resolvedCompanyId,
      lead_id: resolvedLeadId,
      consultant_id: normalizeText(conversation.consultant_id),
      consultant_name: normalizeText(conversation.consultant_name),
      status: normalizeText(conversation.status),
      result: normalizeText(conversation.result),
      started_at: normalizeText(conversation.started_at),
      updated_at: normalizeText(conversation.updated_at)
    },
    "upsertConversation"
  );
}

export async function importMessage(message: MessageInput, conversationId?: string) {
  const externalId = requireExternalId(message.external_id, "message");
  const resolvedConversationId = conversationId ?? normalizeText(message.conversation_id);

  if (!resolvedConversationId) {
    throw new Error("message.conversation_id e obrigatorio.");
  }

  const existing = await getByExternalId<MessageRow>("messages", externalId);

  if (existing) {
    return {
      row: existing,
      created: false
    };
  }

  const rows = await supabaseRequest<MessageRow[]>("messages?select=*", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({
      external_id: externalId,
      conversation_id: resolvedConversationId,
      sender_type: normalizeText(message.sender_type),
      message_text: normalizeText(message.message_text),
      created_at: normalizeText(message.created_at) ?? undefined
    })
  });

  return {
    row: firstReturnedRow(rows, "importMessage"),
    created: true
  };
}

export async function importConversationResult(
  result: ConversationResultInput | undefined,
  conversationId: string
) {
  if (!result) {
    return { created: false };
  }

  await supabaseRequest<SupabaseRow[]>("conversation_results", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({
      conversation_id: conversationId,
      status: normalizeText(result.status),
      result: normalizeText(result.result),
      loss_reason: normalizeText(result.loss_reason)
    })
  });

  return { created: true };
}

export async function importBatch(input: ImportBatchInput): Promise<ImportBatchResult> {
  const company = await upsertCompany(input.company);
  const lead = await upsertLead(input.lead, company.row.id);
  const conversation = await upsertConversation(
    input.conversation,
    company.row.id,
    lead.row.id
  );

  let messagesCreated = 0;
  let messagesSkipped = 0;

  for (const message of input.messages ?? []) {
    const imported = await importMessage(message, conversation.row.id);

    if (imported.created) {
      messagesCreated += 1;
    } else {
      messagesSkipped += 1;
    }
  }

  const conversationResult = await importConversationResult(
    input.result,
    conversation.row.id
  );

  return {
    companyId: company.row.id,
    leadId: lead.row.id,
    conversationId: conversation.row.id,
    companiesCreated: company.created ? 1 : 0,
    companiesUpdated: company.created ? 0 : 1,
    leadsCreated: lead.created ? 1 : 0,
    leadsUpdated: lead.created ? 0 : 1,
    conversationsCreated: conversation.created ? 1 : 0,
    conversationsUpdated: conversation.created ? 0 : 1,
    messagesCreated,
    messagesSkipped,
    resultsCreated: conversationResult.created ? 1 : 0
  };
}

async function countTable(table: string): Promise<number> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${table}?select=id`, {
    method: "HEAD",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "count=exact"
    }
  });

  if (!response.ok) {
    throw new Error(`Nao foi possivel contar registros de ${table}.`);
  }

  const range = response.headers.get("content-range");
  const count = range?.split("/")[1];

  return count ? Number(count) : 0;
}

export async function getMemorySummary(): Promise<MemorySummary> {
  const [companies, leads, conversations, messages] = await Promise.all([
    countTable("companies"),
    countTable("leads"),
    countTable("conversations"),
    countTable("messages")
  ]);

  return {
    companies,
    leads,
    conversations,
    messages
  };
}
