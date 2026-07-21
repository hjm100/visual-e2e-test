import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PathSecurityError } from "./utils/safe-path.js";
import { listDirectory, applyRename } from "./services/fs.js";
import {
  buildPreview,
  type FileEntry,
  type RenameRule,
  type SortMode,
} from "./services/rename.js";

const port = Number(process.env.TOOL_PORT ?? 3201);
const host = "127.0.0.1";
const serveWeb = process.env.SERVE_WEB === "1";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get("/api/health", async () => ({
  ok: true,
  toolId: process.env.TOOL_ID ?? "image-rename",
  port,
}));

app.get<{ Querystring: { dir?: string; imagesOnly?: string } }>(
  "/api/fs/list",
  async (req, reply) => {
    const dir = req.query.dir;
    if (!dir?.trim()) {
      return reply.status(400).send({ error: "dir 不能为空" });
    }
    try {
      const imagesOnly = req.query.imagesOnly !== "false";
      return listDirectory(dir, imagesOnly);
    } catch (err) {
      const message = err instanceof Error ? err.message : "未知错误";
      const status = err instanceof PathSecurityError ? 400 : 500;
      return reply.status(status).send({ error: message });
    }
  },
);

app.post<{
  Body: {
    dir?: string;
    files?: string[];
    sort?: SortMode;
    rule?: RenameRule;
    allFiles?: FileEntry[];
  };
}>("/api/rename/preview", async (req, reply) => {
  const { dir, files, sort = "name-asc", rule, allFiles } = req.body ?? {};
  if (!dir?.trim() || !files?.length || !rule) {
    return reply.status(400).send({ error: "dir、files、rule 不能为空" });
  }
  try {
    const entries = allFiles ?? listDirectory(dir, false);
    return buildPreview(entries, files, sort, rule);
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return reply.status(400).send({ error: message });
  }
});

app.post<{
  Body: { dir?: string; items?: Array<{ from: string; to: string }> };
}>("/api/rename/apply", async (req, reply) => {
  const { dir, items } = req.body ?? {};
  if (!dir?.trim() || !items?.length) {
    return reply.status(400).send({ error: "dir、items 不能为空" });
  }
  try {
    return applyRename(dir, items);
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return reply.status(400).send({ error: message });
  }
});

if (serveWeb) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../../web/dist");
  if (existsSync(root)) {
    await app.register(fastifyStatic, { root, prefix: "/" });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith("/api")) return reply.code(404).send({ error: "Not found" });
      return reply.sendFile("index.html", root);
    });
  }
}

await app.listen({ port, host });
console.log(`image-rename tool: http://${host}:${port}`);
