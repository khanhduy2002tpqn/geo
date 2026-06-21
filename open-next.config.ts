import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// useWorkerdCondition: false → esbuild resolves @libsql/isomorphic-ws via the
// `node` condition (./node.mjs, which exists) instead of `workerd` (./web.mjs,
// missing from OpenNext's copied node_modules → build error).
//
// @libsql/client/http pulls the hrana-client index, which statically imports
// isomorphic-ws even though only HTTP transport is used (WebSocket is never
// instantiated for an https:// Turso URL).
//
// Safe to force the node condition here: db/client.ts imports ONLY the HTTP-only
// entries (@libsql/client/http + drizzle-orm/libsql/http), so the native libsql
// path (node.js → sqlite3.js → @neon-rs) is never bundled — no "Neon:
// unsupported Linux architecture" at runtime on workerd.
const baseConfig = defineCloudflareConfig({});

export default {
	...baseConfig,
	cloudflare: {
		...baseConfig.cloudflare,
		useWorkerdCondition: false,
	},
};
