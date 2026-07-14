import { createWriteStream, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import archiver from "archiver";
import type { FastifyReply } from "fastify";

export interface RunArchiveEntry {
  runId: string;
  runDir: string;
}

function addDirToArchive(archive: archiver.Archiver, runDir: string, zipPrefix: string): void {
  const stack: string[] = [""];
  while (stack.length > 0) {
    const rel = stack.pop()!;
    const abs = join(runDir, rel);
    for (const name of readdirSync(abs)) {
      const childRel = rel ? join(rel, name) : name;
      const childAbs = join(runDir, childRel);
      const st = statSync(childAbs);
      const entryName = zipPrefix ? join(zipPrefix, childRel) : childRel;
      if (st.isDirectory()) {
        stack.push(childRel);
      } else {
        archive.file(childAbs, { name: entryName.replace(/\\/g, "/") });
      }
    }
  }
}

export async function pipeRunsZip(
  reply: FastifyReply,
  entries: RunArchiveEntry[],
  filename: string,
): Promise<void> {
  reply.hijack();
  const archive = archiver("zip", { zlib: { level: 6 } });
  reply.raw.writeHead(200, {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
  archive.pipe(reply.raw);

  archive.on("error", (err) => {
    reply.raw.destroy(err);
  });

  for (const { runId, runDir } of entries) {
    const prefix = entries.length === 1 ? "" : runId;
    addDirToArchive(archive, runDir, prefix);
  }

  await archive.finalize();
}

/** Write zip to a temp path (for tests); production uses pipeRunsZip. */
export async function writeRunsZip(destPath: string, entries: RunArchiveEntry[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(destPath);
    const archive = archiver("zip", { zlib: { level: 6 } });
    output.on("close", () => resolve());
    archive.on("error", reject);
    archive.pipe(output);
    for (const { runId, runDir } of entries) {
      const prefix = entries.length === 1 ? "" : runId;
      addDirToArchive(archive, runDir, prefix);
    }
    void archive.finalize();
  });
}

export function runDirExists(runDir: string): boolean {
  return existsSync(runDir) && statSync(runDir).isDirectory();
}
