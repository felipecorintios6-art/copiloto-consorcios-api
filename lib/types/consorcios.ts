export type CompanyContext = {
  name: string;
  objective: string;
};

export type LeadContext = {
  name: string;
  credit_value: string;
  entry_value: string;
  category: string;
  city: string;
};

export type ConversationMessage = {
  sender: "lead" | "consultant" | "system";
  message: string;
};

export type SuggestResponseRequest = {
  company: CompanyContext;
  lead: LeadContext;
  conversation: ConversationMessage[];
};

export type LeadTemperature = "frio" | "morno" | "quente";

export type SuggestResponseResult = {
  provider?: string;
  ai_used?: string;
  model_used?: string;
  suggestion: string;
  lead_temperature: LeadTemperature | "";
  detected_objection: string;
  next_action: string;
};
