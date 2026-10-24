import { createHash } from "crypto";
export function submissionFingerprint(body: Record<string, unknown>) {
  const stable = (value: any): any =>
    Array.isArray(value)
      ? value.map(stable)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .filter((key) => value[key] !== undefined)
              .map((key) => [key, stable(value[key])]),
          )
        : value;
  const { requestId: _id, turnstileToken: _captcha, ...content } = body;
  return createHash("sha256")
    .update(JSON.stringify(stable(content)))
    .digest("hex");
}
