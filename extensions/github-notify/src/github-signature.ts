import crypto from "node:crypto";

export function verifyGitHubSignature(
  secret: string,
  rawBody: Buffer,
  signatureHeader: string,
): boolean {
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}
