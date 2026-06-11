export type CompanyInput = {
  external_id?: string;
  name?: string;
};

export type LeadInput = {
  external_id?: string;
  company_id?: string;
  name?: string;
  phone?: string;
  city?: string;
  state?: string;
  source?: string;
  category?: string;
  credit_value?: string | number;
  entry_value?: string | number;
  status?: string;
};

export type ConversationInput = {
  external_id?: string;
  company_id?: string;
  lead_id?: string;
  consultant_id?: string;
  consultant_name?: string;
  status?: string;
  result?: string;
  started_at?: string;
  updated_at?: string;
};

export type MessageInput = {
  external_id?: string;
  conversation_id?: string;
  sender_type?: string;
  message_text?: string;
  created_at?: string;
};

export type ConversationResultInput = {
  conversation_id?: string;
  status?: string;
  result?: string;
  loss_reason?: string;
};

export type ImportBatchInput = {
  company: CompanyInput;
  lead: LeadInput;
  conversation: ConversationInput;
  messages?: MessageInput[];
  result?: ConversationResultInput;
};

export type ImportBatchResult = {
  companyId: string;
  leadId: string;
  conversationId: string;
  companiesCreated: number;
  companiesUpdated: number;
  leadsCreated: number;
  leadsUpdated: number;
  conversationsCreated: number;
  conversationsUpdated: number;
  messagesCreated: number;
  messagesSkipped: number;
  resultsCreated: number;
};

export type MemorySummary = {
  companies: number;
  leads: number;
  conversations: number;
  messages: number;
};

export type ImportConversationRecord = {
  empresa_nome: string;
  lead_nome: string;
  lead_telefone: string;
  consultor_nome: string;
  categoria_interesse: string;
  valor_credito: string;
  valor_entrada: string;
  cidade_lead: string;
  origem_lead: string;
  status_lead: string;
  resultado_final: string;
  mensagens: string;
};

export type ParsedHistoricalMessage = {
  created_at: string;
  sender: string;
  message: string;
};

export type ImportValidationError = {
  row: number;
  field: string;
  message: string;
};

export type ImportPreview = {
  totalRecords: number;
  validRecords: number;
  errorCount: number;
  errors: ImportValidationError[];
};

export type ImportResult = ImportPreview & {
  importedRecords: number;
  companiesCreated: number;
  leadsCreated: number;
  conversationsCreated: number;
  messagesCreated: number;
};
