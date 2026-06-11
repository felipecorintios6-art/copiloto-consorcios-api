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

export type MemorySummary = {
  companies: number;
  leads: number;
  conversations: number;
  messages: number;
  recentCompanies: Array<{
    id: string;
    name: string;
    created_at: string;
  }>;
};
