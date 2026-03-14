// Narrow plugin-sdk surface for the bundled memory-core-plus extension.
// Keep this list additive and scoped to symbols used under extensions/memory-core-plus.

export { emptyPluginConfigSchema } from "../plugins/config-schema.js";
export type { OpenClawPluginApi } from "../plugins/types.js";
// Auto-Recall: memory search manager types
export type { MemorySearchManager, MemorySearchResult } from "../memory/types.js";
export type { MemorySearchManagerResult } from "../memory/search-manager.js";
