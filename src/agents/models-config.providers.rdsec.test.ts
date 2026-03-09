import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withEnvAsync } from "../test-utils/env.js";
import { resolveApiKeyForProvider } from "./model-auth.js";
import { buildRdsecProvider, resolveImplicitProviders } from "./models-config.providers.js";

describe("RDSEC provider", () => {
  it("should include rdsec when RDSEC_API_KEY is configured", async () => {
    const agentDir = mkdtempSync(join(tmpdir(), "openclaw-test-"));
    await withEnvAsync({ RDSEC_API_KEY: "test-key" }, async () => {
      const providers = await resolveImplicitProviders({ agentDir });
      expect(providers?.rdsec).toBeDefined();
      expect(providers?.rdsec?.models?.length).toBeGreaterThan(0);
    });
  });

  it("resolves the rdsec api key value from env", async () => {
    const agentDir = mkdtempSync(join(tmpdir(), "openclaw-test-"));
    await withEnvAsync({ RDSEC_API_KEY: "rdsec-test-api-key" }, async () => {
      const auth = await resolveApiKeyForProvider({
        provider: "rdsec",
        agentDir,
      });

      expect(auth.apiKey).toBe("rdsec-test-api-key");
      expect(auth.mode).toBe("api-key");
      expect(auth.source).toContain("RDSEC_API_KEY");
    });
  });

  it("should build rdsec provider with correct configuration", () => {
    const provider = buildRdsecProvider();
    expect(provider.baseUrl).toBe("https://api.rdsec.trendmicro.com/prod/aiendpoint/v1");
    expect(provider.api).toBe("openai-completions");
    expect(provider.models).toBeDefined();
    expect(provider.models.length).toBe(4);
  });

  it("should include all expected rdsec models", () => {
    const provider = buildRdsecProvider();
    const modelIds = provider.models.map((m) => m.id);
    expect(modelIds).toContain("claude-4-sonnet");
    expect(modelIds).toContain("claude-4.6-opus");
    expect(modelIds).toContain("gpt-5.2");
    expect(modelIds).toContain("whisper-1");
  });

  it("all models should have compat.supportsStore = false", () => {
    const provider = buildRdsecProvider();
    for (const model of provider.models) {
      expect(model.compat).toEqual({ supportsStore: false });
    }
  });

  it("all models should have zero cost", () => {
    const provider = buildRdsecProvider();
    for (const model of provider.models) {
      expect(model.cost).toEqual({
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
      });
    }
  });

  it("should not include rdsec when no API key is configured", async () => {
    const agentDir = mkdtempSync(join(tmpdir(), "openclaw-test-"));
    await withEnvAsync({ RDSEC_API_KEY: undefined }, async () => {
      const providers = await resolveImplicitProviders({ agentDir });
      expect(providers?.rdsec).toBeUndefined();
    });
  });
});
