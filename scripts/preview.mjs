import { build } from "esbuild";
import path from "node:path";

/** Gera preview/index.html (telas estáticas) usando o stub do SDK. */
await build({
  entryPoints: [path.resolve("test/preview.ts")],
  outfile: path.resolve("node_modules/.cache/owlbear-merchant/preview.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  logLevel: "warning",
  packages: "external",
  alias: {
    "@owlbear-rodeo/sdk": path.resolve("test/obr-stub.ts"),
  },
  define: {
    "import.meta.env.BASE_URL": '"/"',
    "import.meta.env.MODE": '"test"',
  },
  loader: { ".css": "empty" },
});

await import(path.resolve("node_modules/.cache/owlbear-merchant/preview.mjs"));
