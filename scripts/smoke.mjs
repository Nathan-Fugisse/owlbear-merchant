import { build } from "esbuild";
import path from "node:path";

/**
 * Empacota o smoke test trocando o SDK do Owlbear por um stub e executa em Node.
 * Assim conseguimos renderizar todas as telas sem abrir o navegador.
 */
await build({
  entryPoints: [path.resolve("test/smoke.ts")],
  outfile: path.resolve("node_modules/.cache/owlbear-merchant/smoke.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  logLevel: "warning",
  alias: {
    "@owlbear-rodeo/sdk": path.resolve("test/obr-stub.ts"),
  },
  define: {
    "import.meta.env.BASE_URL": '"/"',
    "import.meta.env.MODE": '"test"',
  },
  loader: { ".css": "empty" },
});

await import(path.resolve("node_modules/.cache/owlbear-merchant/smoke.mjs"));
