// apps/api/esbuild.config.mjs
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url)),
);

// Bundle workspace packages (@foundit/types) directly into the output, since
// its package.json `exports` points at raw TypeScript source, which plain
// `node` can't resolve at runtime on its own. Real npm dependencies stay
// external so they're required normally from node_modules at runtime
// (avoids unnecessarily bundling generated/native code like @prisma/client).
const external = Object.keys(pkg.dependencies ?? {}).filter(
  (name) => !name.startsWith("@foundit/"),
);

await build({
  entryPoints: ["src/server.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: "dist/server.js",
  external,
  sourcemap: true,
});
