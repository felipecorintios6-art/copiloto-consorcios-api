import crypto from "node:crypto";

const algorithm = "aes-256-gcm";

function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_SECRET;

  if (!secret) {
    throw new Error("ENCRYPTION_SECRET nao configurada.");
  }

  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptOpenRouterKey(apiKey: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted]
    .map((part) => part.toString("base64"))
    .join(":");
}

export function decryptOpenRouterKey(encryptedValue: string): string {
  const [ivValue, tagValue, encryptedKey] = encryptedValue.split(":");

  if (!ivValue || !tagValue || !encryptedKey) {
    throw new Error("Chave OpenRouter criptografada em formato invalido.");
  }

  const decipher = crypto.createDecipheriv(
    algorithm,
    getEncryptionKey(),
    Buffer.from(ivValue, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedKey, "base64")),
    decipher.final()
  ]).toString("utf8");
}

export function previewOpenRouterKey(apiKey: string): string {
  const trimmed = apiKey.trim();

  if (trimmed.length <= 10) {
    return "****";
  }

  return `${trimmed.slice(0, 7)}...${trimmed.slice(-4)}`;
}
