import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
function key(secret: string) {
  if (!secret) throw new Error("OUTBOX_SECRET or JWT_SECRET is required");
  return createHash("sha256").update(`oferta:outbox:v1:${secret}`).digest();
}
export function sealPayload(payload: object, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return {
    sealed: Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64"),
  };
}
export function openPayload(payload: { sealed: string }, secret: string) {
  const raw = Buffer.from(payload.sealed, "base64");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(secret),
    raw.subarray(0, 12),
  );
  decipher.setAuthTag(raw.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([
      decipher.update(raw.subarray(28)),
      decipher.final(),
    ]).toString("utf8"),
  );
}
