import type { AIMessage } from "@/lib/types/ai";

export type OpenRouterKeyStatus = "active" | "inactive";

export type OpenRouterKeyHealth =
  | "active"
  | "near_limit"
  | "cooldown"
  | "daily_limit_reached"
  | "inactive";

export type OpenRouterKeyRow = {
  id: string;
  label: string;
  model: string;
  api_key_encrypted: string;
  key_preview: string;
  status: OpenRouterKeyStatus;
  priority: number;
  daily_limit: number;
  daily_used: number;
  daily_remaining: number;
  concurrent_limit: number;
  current_concurrent: number;
  cooldown_until: string | null;
  last_used_at: string | null;
  reset_at: string | null;
  tenant_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OpenRouterKeyPublic = Omit<
  OpenRouterKeyRow,
  "api_key_encrypted"
> & {
  health: OpenRouterKeyHealth;
  recent_errors?: OpenRouterUsageLogRow[];
};

export type OpenRouterUsageLogRow = {
  id: string;
  key_id: string | null;
  tenant_id: string | null;
  endpoint: string | null;
  status: string;
  error_code: string | null;
  error_message: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  estimated_cost: number | null;
  created_at: string;
};

export type CreateOpenRouterKeyInput = {
  label: string;
  api_key: string;
  model?: string;
  status?: OpenRouterKeyStatus;
  priority?: number;
  daily_limit?: number;
  concurrent_limit?: number;
  tenant_id?: string | null;
  notes?: string | null;
};

export type UpdateOpenRouterKeyInput = Partial<
  Omit<CreateOpenRouterKeyInput, "api_key">
> & {
  api_key?: string;
  daily_used?: number;
  daily_remaining?: number;
  cooldown_until?: string | null;
  reset_at?: string | null;
};

export type SelectedOpenRouterKey = OpenRouterKeyRow & {
  apiKey: string;
};

export type RecordOpenRouterUsageInput = {
  keyId?: string | null;
  tenantId?: string | null;
  endpoint: string;
  status: "success" | "error" | "queued";
  errorCode?: string | null;
  errorMessage?: string | null;
  tokensInput?: number | null;
  tokensOutput?: number | null;
  estimatedCost?: number | null;
  usedAmount?: number;
  rateLimited?: boolean;
};

export type QueueAIRequestInput = {
  tenantId?: string | null;
  endpoint: string;
  payload: {
    model: string;
    messages: AIMessage[];
  };
  lastError?: string;
};

export type QueuedAIRequestRow = {
  id: string;
  tenant_id: string | null;
  endpoint: string;
  payload: {
    model: string;
    messages: AIMessage[];
  };
  status: string;
  attempts: number;
  last_error: string | null;
  scheduled_for: string;
  created_at: string;
  updated_at: string;
};

export type ProcessQueueResult = {
  processed: number;
  succeeded: number;
  failed: number;
  keptPending: number;
};
