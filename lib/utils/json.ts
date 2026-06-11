export function extractJSONObject(text: string): string {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("A IA nao retornou um JSON valido.");
  }

  return trimmed.slice(start, end + 1);
}

export function parseJSONObject<T>(text: string): T {
  return JSON.parse(extractJSONObject(text)) as T;
}
