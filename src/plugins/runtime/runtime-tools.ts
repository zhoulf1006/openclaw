import { createMemoryGetTool, createMemorySearchTool } from "../../agents/tools/memory-tool.js";
import { registerMemoryCli } from "../../cli/memory-cli.js";
import { getMemorySearchManager } from "../../memory/search-manager.js";
import type { PluginRuntime } from "./types.js";

export function createRuntimeTools(): PluginRuntime["tools"] {
  return {
    createMemoryGetTool,
    createMemorySearchTool,
    registerMemoryCli,
    getMemorySearchManager,
  };
}
