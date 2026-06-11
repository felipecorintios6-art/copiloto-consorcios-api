import {
  decryptOpenRouterKey,
  encryptOpenRouterKey,
  previewOpenRouterKey
} from "@/lib/openrouter/crypto";
import {
  encodeFilter,
  supabaseRequest
} from "@/lib/openrouter/supabase";
import type {
  CreateOpenRouterKeyInput,
  OpenRouterKeyHealth,
  OpenRouterKeyPublic,
  OpenRouterKeyRow,
  OpenRouterUsageLogRow,
  ProcessQueueResult,
  QueueAIRequestInput,
  QueuedAIRequestRow,
  RecordOpenRouterUsageInput,
  SelectedOpenRouterKey,
  UpdateOpenRouterKeyInput
} from "@/lib/types/openrouterCapacity";
import type { AIMessage } from "@/lib/types/ai";

const defaultNearLimitMargin = 0.1;
const defaultCooldownMinutes = 15;
const maxQueueAttempts = 3;

function nowISO() {
  return new Date().toISOString();
}

function nextResetAt() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return tomorrow.toISOString();
}

function getNearLimitMargin() {
  const configured = Number(process.env.OPENROUTER_NEAR_LIMIT_MARGIN);

  if (Number.isFinite(configured) && configured >= 0 && configured <= 1) {
    return configured;
  }

  return defaultNearLimitMargin;
}

function getCooldownUntil() {
  const configured = Number(process.env.OPENROUTER_COOLDOWN_MINUTES);
  const minutes =
    Number.isFinite(configured) && configured > 0
      ? configured
      : defaultCooldownMinutes;

  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function isCooldownActive(key: OpenRouterKeyRow) {
  return key.cooldown_until
    ? new Date(key.cooldown_until).getTime() > Date.now()
    : false;
}

export function getOpenRouterKeyHealth(
  key: OpenRouterKeyRow
): OpenRouterKeyHealth {
  if (key.status !== "active") {
    return "inactive";
  }

  if (isCooldownActive(key)) {
    return "cooldown";
  }

  if (key.daily_remaining <= 0) {
    return "daily_limit_reached";
  }

  if (key.daily_limit > 0) {
    const margin = Math.ceil(key.daily_limit * getNearLimitMargin());

    if (key.daily_remaining <= margin) {
      return "near_limit";
    }
  }

  return "active";
}

function toPublicKey(key: OpenRouterKeyRow): OpenRouterKeyPublic {
  const { api_key_encrypted: _apiKeyEncrypted, ...publicKey } = key;

  return {
    ...publicKey,
    health: getOpenRouterKeyHealth(key)
  };
}

function firstRow<T>(rows: T[], action: string): T {
  const row = rows[0];

  if (!row) {
    throw new Error(`Supabase nao retornou dados em ${action}.`);
  }

  return row;
}

function normalizeTenantFilter(tenantId?: string | null) {
  return tenantId ? `tenant_id=eq.${encodeFilter(tenantId)}` : "tenant_id=is.null";
}

async function listCandidateKeys(tenantId?: string | null) {
  const keys = await supabaseRequest<OpenRouterKeyRow[]>(
    `openrouter_keys?${normalizeTenantFilter(
      tenantId
    )}&status=eq.active&select=*&order=priority.desc,daily_remaining.desc,last_used_at.asc.nullsfirst`
  );

  return Promise.all(keys.map(resetKeyIfNeeded));
}

async function resetKeyIfNeeded(key: OpenRouterKeyRow) {
  if (!key.reset_at) {
    const rows = await supabaseRequest<OpenRouterKeyRow[]>(
      `openrouter_keys?id=eq.${key.id}&select=*`,
      {
        method: "PATCH",
        prefer: "return=representation",
        body: JSON.stringify({
          reset_at: nextResetAt(),
          updated_at: nowISO()
        })
      }
    );

    return firstRow(rows, "scheduleKeyReset");
  }

  if (new Date(key.reset_at).getTime() > Date.now()) {
    return key;
  }

  const rows = await supabaseRequest<OpenRouterKeyRow[]>(
    `openrouter_keys?id=eq.${key.id}&select=*`,
    {
      method: "PATCH",
      prefer: "return=representation",
      body: JSON.stringify({
        daily_used: 0,
        daily_remaining: key.daily_limit,
        reset_at: nextResetAt(),
        updated_at: nowISO()
      })
    }
  );

  return firstRow(rows, "resetKeyIfNeeded");
}

function canUseKey(key: OpenRouterKeyRow) {
  return (
    key.status === "active" &&
    !isCooldownActive(key) &&
    key.daily_remaining > 0 &&
    key.current_concurrent < key.concurrent_limit
  );
}

function chooseBestKey(keys: OpenRouterKeyRow[]) {
  const usable = keys.filter(canUseKey);

  if (usable.length === 0) {
    return null;
  }

  const nonNearLimit = usable.filter(
    (key) => getOpenRouterKeyHealth(key) !== "near_limit"
  );
  const pool = nonNearLimit.length > 0 ? nonNearLimit : usable;

  return [...pool].sort((first, second) => {
    if (second.priority !== first.priority) {
      return second.priority - first.priority;
    }

    if (second.daily_remaining !== first.daily_remaining) {
      return second.daily_remaining - first.daily_remaining;
    }

    const firstLastUsed = first.last_used_at
      ? new Date(first.last_used_at).getTime()
      : 0;
    const secondLastUsed = second.last_used_at
      ? new Date(second.last_used_at).getTime()
      : 0;

    return firstLastUsed - secondLastUsed;
  })[0];
}

async function reserveOpenRouterKey(key: OpenRouterKeyRow) {
  const rows = await supabaseRequest<OpenRouterKeyRow[]>(
    `openrouter_keys?id=eq.${key.id}&select=*`,
    {
      method: "PATCH",
      prefer: "return=representation",
      body: JSON.stringify({
        current_concurrent: key.current_concurrent + 1,
        last_used_at: nowISO(),
        updated_at: nowISO()
      })
    }
  );

  return firstRow(rows, "reserveOpenRouterKey");
}

export async function selectAvailableOpenRouterKey(options?: {
  tenantId?: string | null;
}): Promise<SelectedOpenRouterKey | null> {
  const candidates = await listCandidateKeys(options?.tenantId ?? null);
  const selected = chooseBestKey(candidates);

  if (!selected) {
    return null;
  }

  const reserved = await reserveOpenRouterKey(selected);

  return {
    ...reserved,
    apiKey: decryptOpenRouterKey(reserved.api_key_encrypted)
  };
}

export async function releaseOpenRouterKey(keyId: string) {
  const rows = await supabaseRequest<OpenRouterKeyRow[]>(
    `openrouter_keys?id=eq.${keyId}&select=*`
  );
  const key = rows[0];

  if (!key) {
    return;
  }

  await supabaseRequest<OpenRouterKeyRow[]>(
    `openrouter_keys?id=eq.${keyId}&select=id`,
    {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({
        current_concurrent: Math.max(key.current_concurrent - 1, 0),
        updated_at: nowISO()
      })
    }
  );
}

export async function recordOpenRouterUsage(input: RecordOpenRouterUsageInput) {
  await supabaseRequest<OpenRouterUsageLogRow[]>("openrouter_key_usage_logs", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({
      key_id: input.keyId ?? null,
      tenant_id: input.tenantId ?? null,
      endpoint: input.endpoint,
      status: input.status,
      error_code: input.errorCode ?? null,
      error_message: input.errorMessage ?? null,
      tokens_input: input.tokensInput ?? null,
      tokens_output: input.tokensOutput ?? null,
      estimated_cost: input.estimatedCost ?? null
    })
  });

  if (!input.keyId) {
    return;
  }

  const rows = await supabaseRequest<OpenRouterKeyRow[]>(
    `openrouter_keys?id=eq.${input.keyId}&select=*`
  );
  const key = rows[0];

  if (!key) {
    return;
  }

  const usedAmount = input.usedAmount ?? 1;
  const nextDailyUsed =
    input.status === "success" ? key.daily_used + usedAmount : key.daily_used;
  const nextDailyRemaining =
    input.status === "success"
      ? Math.max(key.daily_limit - nextDailyUsed, 0)
      : key.daily_remaining;

  await supabaseRequest<OpenRouterKeyRow[]>(
    `openrouter_keys?id=eq.${input.keyId}&select=id`,
    {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({
        daily_used: nextDailyUsed,
        daily_remaining: nextDailyRemaining,
        cooldown_until: input.rateLimited ? getCooldownUntil() : key.cooldown_until,
        updated_at: nowISO()
      })
    }
  );
}

export async function queueAIRequest(input: QueueAIRequestInput) {
  const rows = await supabaseRequest<QueuedAIRequestRow[]>(
    "ai_request_queue?select=*",
    {
      method: "POST",
      prefer: "return=representation",
      body: JSON.stringify({
        tenant_id: input.tenantId ?? null,
        endpoint: input.endpoint,
        payload: input.payload,
        status: "pending",
        attempts: 0,
        last_error: input.lastError ?? null,
        scheduled_for: nowISO()
      })
    }
  );

  return firstRow(rows, "queueAIRequest");
}

async function updateQueueItem(
  id: string,
  values: Partial<Pick<QueuedAIRequestRow, "status" | "attempts" | "last_error" | "scheduled_for">>
) {
  await supabaseRequest<QueuedAIRequestRow[]>(`ai_request_queue?id=eq.${id}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({
      ...values,
      updated_at: nowISO()
    })
  });
}

export async function listOpenRouterKeys() {
  const keys = await supabaseRequest<OpenRouterKeyRow[]>(
    "openrouter_keys?select=*&order=priority.desc,daily_remaining.desc"
  );
  const logs = await supabaseRequest<OpenRouterUsageLogRow[]>(
    "openrouter_key_usage_logs?status=eq.error&select=*&order=created_at.desc&limit=30"
  );

  return keys.map((key) => ({
    ...toPublicKey(key),
    recent_errors: logs.filter((log) => log.key_id === key.id).slice(0, 3)
  }));
}

export async function createOpenRouterKey(input: CreateOpenRouterKeyInput) {
  const dailyLimit = input.daily_limit ?? 100;
  const apiKey = input.api_key.trim();

  if (!apiKey) {
    throw new Error("api_key e obrigatoria.");
  }

  const rows = await supabaseRequest<OpenRouterKeyRow[]>(
    "openrouter_keys?select=*",
    {
      method: "POST",
      prefer: "return=representation",
      body: JSON.stringify({
        label: input.label,
        model: input.model ?? process.env.OPENROUTER_MODEL ?? "openrouter/free",
        api_key_encrypted: encryptOpenRouterKey(apiKey),
        key_preview: previewOpenRouterKey(apiKey),
        status: input.status ?? "active",
        priority: input.priority ?? 0,
        daily_limit: dailyLimit,
        daily_used: 0,
        daily_remaining: dailyLimit,
        concurrent_limit: input.concurrent_limit ?? 1,
        current_concurrent: 0,
        reset_at: nextResetAt(),
        tenant_id: input.tenant_id ?? null,
        notes: input.notes ?? null
      })
    }
  );

  return toPublicKey(firstRow(rows, "createOpenRouterKey"));
}

export async function updateOpenRouterKey(
  id: string,
  input: UpdateOpenRouterKeyInput
) {
  const updatePayload: Record<string, unknown> = {
    updated_at: nowISO()
  };

  for (const field of [
    "label",
    "model",
    "status",
    "priority",
    "daily_limit",
    "daily_used",
    "daily_remaining",
    "concurrent_limit",
    "cooldown_until",
    "reset_at",
    "tenant_id",
    "notes"
  ] as const) {
    if (field in input) {
      updatePayload[field] = input[field] ?? null;
    }
  }

  if (input.api_key) {
    updatePayload.api_key_encrypted = encryptOpenRouterKey(input.api_key);
    updatePayload.key_preview = previewOpenRouterKey(input.api_key);
  }

  const rows = await supabaseRequest<OpenRouterKeyRow[]>(
    `openrouter_keys?id=eq.${id}&select=*`,
    {
      method: "PATCH",
      prefer: "return=representation",
      body: JSON.stringify(updatePayload)
    }
  );

  return toPublicKey(firstRow(rows, "updateOpenRouterKey"));
}

export async function deleteOpenRouterKey(id: string) {
  await supabaseRequest(`openrouter_keys?id=eq.${id}`, {
    method: "DELETE",
    prefer: "return=minimal"
  });
}

async function callOpenRouterDirectly(input: {
  key: SelectedOpenRouterKey;
  model: string;
  messages: AIMessage[];
}) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.key.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://copiloto-consorcios-api.vercel.app",
      "X-Title": "Copiloto Cons\u00f3rcios API"
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages
    })
  });

  const text = await response.text();
  let errorMessage = text;

  try {
    const data = JSON.parse(text) as { error?: { message?: string } };
    errorMessage = data.error?.message ?? text;
  } catch {
    errorMessage = text;
  }

  return {
    ok: response.ok,
    statusCode: response.status,
    errorMessage,
    rateLimited: response.status === 429 || /rate|limit/i.test(errorMessage)
  };
}

export async function processOpenRouterQueue(
  limit = 5
): Promise<ProcessQueueResult> {
  const queue = await supabaseRequest<QueuedAIRequestRow[]>(
    `ai_request_queue?status=eq.pending&scheduled_for=lte.${encodeFilter(
      nowISO()
    )}&select=*&order=created_at.asc&limit=${limit}`
  );
  const result: ProcessQueueResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    keptPending: 0
  };

  for (const item of queue) {
    result.processed += 1;
    const key = await selectAvailableOpenRouterKey({
      tenantId: item.tenant_id
    });

    if (!key) {
      result.keptPending += 1;
      continue;
    }

    let failureAlreadyRecorded = false;

    try {
      const openRouterResult = await callOpenRouterDirectly({
        key,
        model: item.payload.model,
        messages: item.payload.messages
      });

      if (!openRouterResult.ok) {
        await recordOpenRouterUsage({
          keyId: key.id,
          tenantId: item.tenant_id,
          endpoint: item.endpoint,
          status: "error",
          errorCode: String(openRouterResult.statusCode),
          errorMessage: openRouterResult.errorMessage,
          rateLimited: openRouterResult.rateLimited
        });
        failureAlreadyRecorded = true;
        throw new Error(
          openRouterResult.errorMessage || "OpenRouter recusou a requisicao da fila."
        );
      }

      await recordOpenRouterUsage({
        keyId: key.id,
        tenantId: item.tenant_id,
        endpoint: item.endpoint,
        status: "success"
      });
      await updateQueueItem(item.id, {
        status: "done",
        attempts: item.attempts + 1,
        last_error: null
      });
      result.succeeded += 1;
    } catch (error) {
      const attempts = item.attempts + 1;
      const message =
        error instanceof Error ? error.message : "Erro ao processar fila.";

      if (!failureAlreadyRecorded) {
        await recordOpenRouterUsage({
          keyId: key.id,
          tenantId: item.tenant_id,
          endpoint: item.endpoint,
          status: "error",
          errorMessage: message
        });
      }

      if (attempts >= maxQueueAttempts) {
        await updateQueueItem(item.id, {
          status: "failed",
          attempts,
          last_error: message
        });
        result.failed += 1;
      } else {
        await updateQueueItem(item.id, {
          status: "pending",
          attempts,
          last_error: message,
          scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        });
        result.keptPending += 1;
      }
    } finally {
      await releaseOpenRouterKey(key.id);
    }
  }

  return result;
}
