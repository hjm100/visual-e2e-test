import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiPort = process.env.TOOL_PORT ?? "3202";
const webPort = Number(process.env.TOOL_WEB_PORT ?? 5202);

export default defineConfig({
  plugins: [react()],
  root: "web",
  server: {
    port: webPort,
    strictPort: true,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
