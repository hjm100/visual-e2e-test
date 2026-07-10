import type { RunJob } from "../../types/module";

export function resolveRunId(job: RunJob): string | undefined {
  if (job.runDir) {
    const id = job.runDir.split("/").filter(Boolean).pop();
    if (id && /^\d{14}$/.test(id)) return id;
  }
  if (/^\d{14}$/.test(job.jobId)) return job.jobId;
  return undefined;
}

export function canManageRunArtifacts(job: RunJob): boolean {
  return job.status !== "running" && !job.cancellable && !!resolveRunId(job);
}
