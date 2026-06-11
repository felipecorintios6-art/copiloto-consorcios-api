type SupabaseInit = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
  prefer?: string;
};

export function getSupabaseConfig() {
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

function parseSupabaseJSON(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function supabaseRequest<T>(
  path: string,
  init: SupabaseInit = {}
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

export async function countTable(table: string): Promise<number> {
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

export function encodeFilter(value: string) {
  return encodeURIComponent(value);
}
