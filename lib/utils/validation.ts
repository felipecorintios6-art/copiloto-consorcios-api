import type {
  ConversationMessage,
  SuggestResponseRequest,
  SuggestResponseResult
} from "@/lib/types/consorcios";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isConversationMessage(value: unknown): value is ConversationMessage {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.sender === "lead" ||
      value.sender === "consultant" ||
      value.sender === "system") &&
    isString(value.message)
  );
}

export function validateSuggestResponseRequest(
  body: unknown
): SuggestResponseRequest {
  if (!isRecord(body) || !isRecord(body.company) || !isRecord(body.lead)) {
    throw new Error("Payload invalido.");
  }

  const { company, lead } = body;

  const requiredCompanyFields = ["name", "objective"] as const;
  const requiredLeadFields = [
    "name",
    "credit_value",
    "entry_value",
    "category",
    "city"
  ] as const;

  for (const field of requiredCompanyFields) {
    if (!isString(company[field])) {
      throw new Error(`Campo company.${field} invalido.`);
    }
  }

  for (const field of requiredLeadFields) {
    if (!isString(lead[field])) {
      throw new Error(`Campo lead.${field} invalido.`);
    }
  }

  if (
    !Array.isArray(body.conversation) ||
    !body.conversation.every(isConversationMessage)
  ) {
    throw new Error("Campo conversation invalido.");
  }

  const conversation = body.conversation as ConversationMessage[];

  return {
    company: {
      name: company.name as string,
      objective: company.objective as string
    },
    lead: {
      name: lead.name as string,
      credit_value: lead.credit_value as string,
      entry_value: lead.entry_value as string,
      category: lead.category as string,
      city: lead.city as string
    },
    conversation
  };
}

export function normalizeSuggestResponseResult(
  value: Partial<SuggestResponseResult>
): SuggestResponseResult {
  const temperature = value.lead_temperature;

  return {
    suggestion: value.suggestion ?? "",
    lead_temperature:
      temperature === "frio" || temperature === "morno" || temperature === "quente"
        ? temperature
        : "",
    detected_objection: value.detected_objection ?? "",
    next_action: value.next_action ?? ""
  };
}
