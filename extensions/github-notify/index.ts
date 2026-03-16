import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import { createGitHubWebhookHandler } from "./src/webhook-handler.js";

type GitHubNotifyConfig = {
  webhookPath?: string;
  webhookSecret: string;
  discordChannelId: string;
  discordAccountId?: string;
  actions?: string[];
};

const plugin = {
  id: "github-notify",
  name: "GitHub Notify",
  description: "Receive GitHub PR webhooks, summarize with AI, and notify via Discord",
  register(api: OpenClawPluginApi) {
    const config = (api.pluginConfig ?? {}) as GitHubNotifyConfig;
    if (!config.webhookSecret || !config.discordChannelId) {
      return;
    }

    const webhookPath = config.webhookPath ?? "/api/github-notify";

    api.registerHttpRoute({
      path: webhookPath,
      auth: "plugin",
      match: "exact",
      handler: createGitHubWebhookHandler({
        runtime: api.runtime,
        webhookSecret: config.webhookSecret,
        discordChannelId: config.discordChannelId,
        discordAccountId: config.discordAccountId,
        allowedActions: config.actions ?? ["opened", "reopened"],
      }),
    });
  },
};

export default plugin;
