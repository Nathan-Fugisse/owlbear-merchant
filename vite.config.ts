import { defineConfig, type Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";

function manifestPlugin(): Plugin {
  let base = "/";
  const replace = (raw: string) => raw.replace(/\{\{BASE\}\}/g, base);
  return {
    name: "owlbear-merchant-manifest",
    configResolved(config) { base = config.base; },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/manifest.json") return next();
        try {
          const raw = fs.readFileSync(path.resolve("public/manifest.json"), "utf8");
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(replace(raw));
        } catch { next(); }
      });
    },
    closeBundle() {
      try {
        const raw = fs.readFileSync(path.resolve("public/manifest.json"), "utf8");
        const outDir = path.resolve("dist");
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, "manifest.json"), replace(raw));
      } catch (error) {
        console.error("[manifest] falha ao gerar manifest.json:", error);
      }
    },
  };
}

export default defineConfig({
  base: "/",
  plugins: [manifestPlugin()],
  server: {
    port: 5173,
    strictPort: false,
    cors: { origin: "https://www.owlbear.rodeo" },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: { input: { main: "index.html", background: "background.html" } },
  },
});
