import type {
  ImportConversationRecord,
  MemorySummary,
  ParsedHistoricalMessage
} from "@/lib/types/memory";

type SupabaseRow = Record<string, unknown>;

type CompanyRow = {
  id: string;
  name: string;
  created_at: string;
};

type LeadRow = {
  id: string;
};

type ConversationRow = {
  id: string;
};

type UpsertResult<T> = {
  row: T;
  created: boolean;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL nao configurada.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada.");
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

function firstReturnedRow<T>(rows: T[], operation: string): T {
  const row = rows[0];

  if (!row) {
    throw new Error(`Supabase nao retornou dados em ${operation}.`);
  }

  return row;
}

function encodeFilter(value: string) {
  return encodeURIComponent(value);
}

async function findCompanyByName(name: string): Promise<CompanyRow | null> {
  const rows = await supabaseRequest<CompanyRow[]>(
    `companies?name=eq.${encodeFilter(name)}&select=id,name,created_at&limit=1`
  );

  return rows[0] ?? null;
}

async function createCompany(name: string): Promise<CompanyRow> {
  const rows = await supabaseRequest<CompanyRow[]>("companies?select=id,name,created_at", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({ name })
  });

  return firstReturnedRow(rows, "createCompany");
}

async function findOrCreateCompany(name: string): Promise<UpsertResult<CompanyRow>> {
  const existing = await findCompanyByName(name);

  if (existing) {
    return {
      row: existing,
      created: false
    };
  }

  return {
    row: await createCompany(name),
    created: true
  };
}

async function findLead(record: ImportConversationRecord, companyId: string) {
  const phone = record.lead_telefone;
  const filter = phone
    ? `company_id=eq.${companyId}&phone=eq.${encodeFilter(phone)}`
    : `company_id=eq.${companyId}&name=eq.${encodeFilter(record.lead_nome)}`;

  const rows = await supabaseRequest<LeadRow[]>(
    `leads?${filter}&select=id&limit=1`
  );

  return rows[0] ?? null;
}

async function createLead(
  record: ImportConversationRecord,
  companyId: string
): Promise<LeadRow> {
  const rows = await supabaseRequest<LeadRow[]>("leads?select=id", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({
      company_id: companyId,
      name: record.lead_nome,
      phone: record.lead_telefone || null,
      city: record.cidade_lead || null,
      category: record.categoria_interesse || null,
      credit_value: record.valor_credito || null,
      entry_value: record.valor_entrada || null
    })
  });

  return firstReturnedRow(rows, "createLead");
}

async function findOrCreateLead(
  record: ImportConversationRecord,
  companyId: string
): Promise<UpsertResult<LeadRow>> {
  const existing = await findLead(record, companyId);

  if (existing) {
    return {
      row: existing,
      created: false
    };
  }

  return {
    row: await createLead(record, companyId),
    created: true
  };
}

async function createConversation(
  record: ImportConversationRecord,
  companyId: string,
  leadId: string
): Promise<ConversationRow> {
  const rows = await supabaseRequest<ConversationRow[]>("conversations?select=id", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({
      company_id: companyId,
      lead_id: leadId,
      consultant_name: record.consultor_nome || null,
      status: record.status_lead || null,
      result: record.resultado_final || null
    })
  });

  return firstReturnedRow(rows, "createConversation");
}

async function createMessages(
  conversationId: string,
  messages: ParsedHistoricalMessage[]
) {
  if (messages.length === 0) {
    return;
  }

  await supabaseRequest<SupabaseRow[]>("messages", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify(
      messages.map((message) => ({
        conversation_id: conversationId,
        sender: message.sender,
        message: message.message,
        created_at: message.created_at
      }))
    )
  });
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

export async function importConversationRecord(
  record: ImportConversationRecord,
  messages: ParsedHistoricalMessage[]
) {
  const company = await findOrCreateCompany(record.empresa_nome);
  const lead = await findOrCreateLead(record, company.row.id);
  const conversation = await createConversation(record, company.row.id, lead.row.id);

  await createMessages(conversation.id, messages);

  return {
    companyCreated: company.created,
    leadCreated: lead.created,
    conversationCreated: true,
    messagesCreated: messages.length
  };
}

export async function getMemorySummary(): Promise<MemorySummary> {
  const [companies, leads, conversations, messages, recentCompanies] =
    await Promise.all([
      countTable("companies"),
      countTable("leads"),
      countTable("conversations"),
      countTable("messages"),
      supabaseRequest<CompanyRow[]>(
        "companies?select=id,name,created_at&order=created_at.desc&limit=8"
      )
    ]);

  return {
    companies,
    leads,
    conversations,
    messages,
    recentCompanies
  };
}
