import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { PluginRuntime } from "openclaw/plugin-sdk/core";
import { verifyGitHubSignature } from "./github-signature.js";

type HandlerConfig = {
  runtime: PluginRuntime;
  webhookSecret: string;
  discordChannelId: string;
  discordAccountId?: string;
  allowedActions: string[];
};

type GitHubPR = {
  title: string;
  body: string | null;
  html_url: string;
  number: number;
  additions: number;
  deletions: number;
  changed_files: number;
  user: { login: string };
  head: { ref: string };
  base: { ref: string };
};

type GitHubRepo = {
  full_name: string;
};

type GitHubPRPayload = {
  action: string;
  pull_request: GitHubPR;
  repository: GitHubRepo;
};

function respondJson(res: ServerResponse, status: number, body: Record<string, unknown>): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

export function createGitHubWebhookHandler(config: HandlerConfig) {
  const log = config.runtime.logging.getChildLogger({ plugin: "github-notify" });

  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    if (req.method !== "POST") {
      res.writeHead(405);
      res.end("Method Not Allowed");
      return true;
    }

    // Read raw body for signature verification
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const rawBody = Buffer.concat(chunks);

    // Verify GitHub HMAC-SHA256 signature
    const signature = req.headers["x-hub-signature-256"];
    if (
      !signature ||
      typeof signature !== "string" ||
      !verifyGitHubSignature(config.webhookSecret, rawBody, signature)
    ) {
      respondJson(res, 401, { error: "invalid signature" });
      return true;
    }

    // Parse JSON payload
    let payload: GitHubPRPayload;
    try {
      payload = JSON.parse(rawBody.toString("utf-8")) as GitHubPRPayload;
    } catch {
      respondJson(res, 400, { error: "invalid JSON" });
      return true;
    }

    // Only handle pull_request events
    const event = req.headers["x-github-event"];
    if (event !== "pull_request") {
      respondJson(res, 200, { skipped: true, reason: `event type: ${String(event)}` });
      return true;
    }

    // Filter by allowed actions
    if (!config.allowedActions.includes(payload.action)) {
      respondJson(res, 200, { skipped: true, reason: `action: ${payload.action}` });
      return true;
    }

    // ACK immediately, process asynchronously
    respondJson(res, 202, { accepted: true });

    void processGitHubPR(config, payload, log).catch((err) => {
      log.error(`Failed to process PR: ${String(err)}`);
    });

    return true;
  };
}

async function processGitHubPR(
  config: HandlerConfig,
  payload: GitHubPRPayload,
  log: ReturnType<PluginRuntime["logging"]["getChildLogger"]>,
): Promise<void> {
  const { pull_request: pr, repository: repo } = payload;

  const message = [
    `A new Pull Request has been ${payload.action} on GitHub.`,
    "",
    `Title: ${pr.title}`,
    `Repository: ${repo.full_name}`,
    `Author: ${pr.user.login}`,
    `Branch: ${pr.head.ref} → ${pr.base.ref}`,
    `URL: ${pr.html_url}`,
    `Changes: +${pr.additions} -${pr.deletions} (${pr.changed_files} files)`,
    "",
    "Description:",
    pr.body || "(no description)",
    "",
    "Please provide a concise summary of this PR: what it does, key changes, and any notable points. Format for Discord.",
  ].join("\n");

  const sessionKey = `github-notify:${repo.full_name}:pr-${pr.number}`;

  log.info(`Processing PR #${pr.number} (${payload.action}) from ${repo.full_name}`);

  // Trigger agent to summarize the PR
  const { runId } = await config.runtime.subagent.run({
    sessionKey,
    message,
    idempotencyKey: randomUUID(),
  });

  // Wait for agent completion
  const waitResult = await config.runtime.subagent.waitForRun({
    runId,
    timeoutMs: 120_000,
  });

  if (waitResult.status !== "ok") {
    throw new Error(`Agent run failed: ${waitResult.status} ${waitResult.error ?? ""}`);
  }

  // Get agent response
  const { messages } = await config.runtime.subagent.getSessionMessages({
    sessionKey,
    limit: 10,
  });

  // Extract last assistant message
  const lastAssistant = [...messages]
    .reverse()
    .find((m) => (m as Record<string, unknown>).role === "assistant") as
    | Record<string, unknown>
    | undefined;
  const summaryText = extractTextFromMessage(lastAssistant) ?? "No summary generated.";

  // Format Discord message
  const discordMessage = [
    `**New PR: ${pr.title}**`,
    `> ${repo.full_name}#${pr.number} by ${pr.user.login}`,
    `> ${pr.html_url}`,
    "",
    summaryText,
  ].join("\n");

  // Send to Discord via standard outbound pipeline (chunking, hooks, delivery queue)
  const cfg = config.runtime.config.loadConfig();
  const recipient = config.discordChannelId.includes(":")
    ? config.discordChannelId
    : `channel:${config.discordChannelId}`;
  await config.runtime.outbound.deliverOutboundPayloads({
    cfg,
    channel: "discord",
    to: recipient,
    accountId: config.discordAccountId,
    payloads: [{ text: discordMessage }],
  });

  log.info(`PR #${pr.number} summary sent to Discord channel ${config.discordChannelId}`);

  // Clean up session
  await config.runtime.subagent.deleteSession({
    sessionKey,
    deleteTranscript: true,
  });
}

function extractTextFromMessage(msg: Record<string, unknown> | undefined): string | null {
  if (!msg) {
    return null;
  }
  // Pi agent messages may use "content" (string or array) or "text"
  const content = msg.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .filter((block) => typeof block === "object" && block !== null && block.type === "text")
      .map((block) => (block as { text: string }).text)
      .join("\n");
  }
  if (typeof msg.text === "string") {
    return msg.text;
  }
  return null;
}
