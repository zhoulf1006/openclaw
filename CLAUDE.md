# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenClaw is a multi-channel AI gateway with extensible messaging integrations. It routes AI model responses to messaging surfaces (WhatsApp, Telegram, Slack, Discord, Signal, iMessage, Microsoft Teams, Matrix, etc.). The project is a pnpm monorepo containing a Node.js/TypeScript backend (gateway + CLI + agent runtime), a web UI (Lit/Vite), native apps (macOS/iOS/Android), and ~35 extension packages.

## Build, Test & Development Commands

- **Install deps**: `pnpm install`
- **Build**: `pnpm build`
- **Dev mode**: `pnpm dev` or `pnpm openclaw ...`
- **Gateway dev**: `pnpm gateway:watch` (auto-reloads on changes)
- **Type-check**: `pnpm tsgo` (TypeScript native preview checker)
- **Lint + format + type-check**: `pnpm check` (runs `format:check && tsgo && lint`)
- **Lint only**: `pnpm lint` (oxlint with type-aware rules)
- **Lint fix**: `pnpm lint:fix`
- **Format**: `pnpm format` (oxfmt)
- **Tests**: `pnpm test` (vitest, parallel via custom script)
- **Tests with coverage**: `pnpm test:coverage` (V8 coverage, 70% threshold)
- **Watch mode**: `pnpm test:watch`
- **E2E tests**: `pnpm test:e2e`
- **Live tests** (real API keys): `OPENCLAW_LIVE_TEST=1 CLAWDBOT_LIVE_TEST=1 pnpm test:live`
- **UI dev**: `pnpm ui:dev`
- **UI build**: `pnpm ui:build`
- **UI tests**: `pnpm test:ui`
- **Commit helper**: `scripts/committer "<msg>" <file...>` (scoped staging; avoid manual `git add`/`git commit`)

## Coding Style & Conventions

- **Language**: TypeScript (ESM, strict mode). Node 22+ required. Bun also supported for dev/scripts.
- **Formatting/linting**: Oxlint and Oxfmt. Run `pnpm check` before commits.
- **Imports**: Use `.js` extension for cross-package ESM imports. Use `import type { X }` for type-only imports. Import directly from source — no re-export wrapper files.
- **Naming**: "OpenClaw" for product/docs headings; `openclaw` for CLI command, package, paths, and config keys.
- **File size**: Keep files under ~500 LOC; extract helpers when larger.
- **Strict typing**: Avoid `any`. Use Zod 4 / `@sinclair/typebox` for schema validation.
- **Anti-redundancy**: Always search for existing utilities before creating new ones. Import from centralized modules (e.g., `src/infra/format-time` for time formatting, `src/terminal/table.ts` for tables, `src/cli/progress.ts` for spinners/progress bars, `src/terminal/palette.ts` for colors).

## Architecture

### Core Components

- **Gateway** (`src/gateway/`): WebSocket-based control plane (ws://127.0.0.1:18789) managing sessions, channels, tools, events, and client connections. HTTP via Express 5.
- **Agent runtime** (`src/agents/`): Pi-based agent runtime in RPC mode with tool/block streaming.
- **CLI** (`src/cli/`, `src/commands/`): Commander-based CLI with clack/prompts for interactive flows. Dependency injection via `createDefaultDeps`.
- **Channels** (`src/telegram/`, `src/discord/`, `src/slack/`, `src/signal/`, `src/imessage/`, `src/channels/`, `src/routing/`): Core messaging channel integrations.
- **Control UI** (`ui/`): Lit web components served from the gateway, built with Vite.
- **Plugin SDK** (`src/plugin-sdk/`): Extension API for third-party channel/feature plugins.
- **Media pipeline** (`src/media/`): Image/audio/video processing.
- **Browser control** (`src/browser/`): Playwright-based browser automation.

### Monorepo Structure

Workspace packages defined in `pnpm-workspace.yaml`:
- **Root** (`openclaw`): Core gateway, CLI, agent runtime
- **`ui/`**: Control UI (Lit + Vite, private package)
- **`packages/*`**: Compatibility shims (`clawdbot`, `moltbot`)
- **`extensions/*`**: ~35 extension packages (channels like msteams, matrix, telegram, discord, whatsapp, slack, signal, etc.)

### Extensions/Plugins

- Extensions live under `extensions/*` as workspace packages.
- Plugin-only deps go in the extension's `package.json`, NOT the root.
- Avoid `workspace:*` in `dependencies` (npm install breaks). Put `openclaw` in `devDependencies` or `peerDependencies`.
- Runtime resolves `openclaw/plugin-sdk` via jiti alias.

## Testing

- **Framework**: Vitest with V8 coverage (forks pool, up to 16 workers locally).
- **Test naming**: `*.test.ts` colocated with source; `*.e2e.test.ts` for E2E; `*.live.test.ts` for live tests.
- **Coverage thresholds**: 70% lines/functions/statements, 55% branches.
- **Multiple configs**: `vitest.config.ts` (main), `vitest.e2e.config.ts`, `vitest.live.config.ts`, `vitest.unit.config.ts`, `vitest.gateway.config.ts`, `vitest.extensions.config.ts`.

## Key Constraints

- Never update the Carbon dependency.
- Any dependency with `pnpm.patchedDependencies` must use an exact version (no `^`/`~`).
- Patching dependencies (pnpm patches, overrides, vendored changes) requires explicit approval.
- Tool schema guardrails: avoid `Type.Union` in tool input schemas (no `anyOf`/`oneOf`/`allOf`). Use `stringEnum`/`optionalStringEnum` for string lists. Avoid raw `format` property names in tool schemas.
- When refactoring shared logic, consider all built-in + extension channels (routing, allowlists, pairing, command gating, onboarding, docs).
- When adding channels/extensions, update `.github/labeler.yml` and create matching GitHub labels.
- 请你永远也不要直接修改openclaw.json, 如果需要修改参数，请提供命令行参数，通过命令行修改