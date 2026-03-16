import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyGitHubSignature } from "./github-signature.js";

describe("verifyGitHubSignature", () => {
  const secret = "test-secret-123";

  function sign(body: string | Buffer, sigSecret: string = secret): string {
    const raw = typeof body === "string" ? Buffer.from(body) : body;
    return `sha256=${crypto.createHmac("sha256", sigSecret).update(raw).digest("hex")}`;
  }

  it("accepts valid signature", () => {
    const body = Buffer.from('{"action":"opened"}');
    const sig = sign(body);
    expect(verifyGitHubSignature(secret, body, sig)).toBe(true);
  });

  it("rejects invalid signature", () => {
    const body = Buffer.from('{"action":"opened"}');
    expect(verifyGitHubSignature(secret, body, "sha256=invalid")).toBe(false);
  });

  it("rejects signature with wrong secret", () => {
    const body = Buffer.from('{"action":"opened"}');
    const sig = sign(body, "wrong-secret");
    expect(verifyGitHubSignature(secret, body, sig)).toBe(false);
  });

  it("rejects empty signature", () => {
    const body = Buffer.from('{"action":"opened"}');
    expect(verifyGitHubSignature(secret, body, "")).toBe(false);
  });

  it("rejects malformed signature header", () => {
    const body = Buffer.from('{"action":"opened"}');
    expect(verifyGitHubSignature(secret, body, "not-a-valid-sig")).toBe(false);
  });
});
