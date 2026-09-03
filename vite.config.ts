import { defineConfig } from "vite";

export default defineConfig({
  // Netlify publishes the extension at the domain root.
  base: "/",
  server: {
    port: 5173,
    strictPort: false,
    cors: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "index.html",
        background: "background.html",
      },
    },
  },
});
