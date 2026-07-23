import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getBrowserStatus } from "./resolve-browser.js";
import {
  buildScenarioExport,
  cancelSession,
  commandSession,
  createSession,
  getSession,
} from "./session.js";
import type { ScenarioMeta } from "./types.js";

const port = Number(process.env.TOOL_PORT ?? 3202);
const host = "127.0.0.1";
const serveWeb = process.env.SERVE_WEB === "1";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get("/api/health", async () => ({
  ok: true,
  toolId: process.env.TOOL_ID ?? "scenario-recorder",
  port,
}));

app.get("/api/browser/status", async () => getBrowserStatus());

app.post<{
  Body: {
    startUrl?: string;
    meta?: Partial<ScenarioMeta>;
  };
}>("/api/sessions", async (req, reply) => {
  const startUrl = req.body?.startUrl?.trim();
  const metaInput = req.body?.meta ?? {};
  if (!startUrl) return reply.status(400).send({ error: "startUrl 不能为空" });
  if (!metaInput.id?.trim()) return reply.status(400).send({ error: "场景 id 不能为空" });
  if (!metaInput.name?.trim()) return reply.status(400).send({ error: "场景名称不能为空" });
  if (!metaInput.module?.trim()) return reply.status(400).send({ error: "模块不能为空" });

  const meta: ScenarioMeta = {
    id: metaInput.id.trim(),
    name: metaInput.name.trim(),
    module: metaInput.module.trim(),
    requiresLogin: metaInput.requiresLogin ?? false,
  };

  try {
    const session = await createSession({ startUrl, meta });
    return session;
  } catch (err) {
    const message = err instanceof Error ? err.message : "创建会话失败";
    return reply.status(500).send({ error: message });
  }
});

app.get<{ Params: { sessionId: string } }>("/api/sessions/:sessionId", async (req, reply) => {
  const session = getSession(req.params.sessionId);
  if (!session) return reply.status(404).send({ error: "会话不存在" });
  return session;
});

app.post<{
  Params: { sessionId: string };
  Body: { command?: "start" | "pause" | "resume" | "stop" };
}>("/api/sessions/:sessionId/command", async (req, reply) => {
  const command = req.body?.command;
  if (!command) return reply.status(400).send({ error: "command 不能为空" });
  try {
    return await commandSession(req.params.sessionId, command);
  } catch (err) {
    const message = err instanceof Error ? err.message : "命令执行失败";
    return reply.status(400).send({ error: message });
  }
});

app.delete<{ Params: { sessionId: string } }>("/api/sessions/:sessionId", async (req, reply) => {
  await cancelSession(req.params.sessionId);
  return { ok: true };
});

app.get<{ Params: { sessionId: string } }>("/api/sessions/:sessionId/export", async (req, reply) => {
  const session = getSession(req.params.sessionId);
  if (!session) return reply.status(404).send({ error: "会话不存在" });
  return buildScenarioExport(session.meta, session.steps);
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
console.log(`scenario-recorder tool: http://${host}:${port}`);
