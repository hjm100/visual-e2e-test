import type { QueryClient } from "@tanstack/react-query";
import type { RunJob } from "../../types/module";

export function seedRunCache(qc: QueryClient, projectId: string | undefined, job: RunJob): void {
  if (!projectId) return;
  qc.setQueryData<RunJob[]>(["runs", projectId], (prev) => {
    const list = prev ?? [];
    return [job, ...list.filter((j) => j.jobId !== job.jobId)];
  });
  void qc.invalidateQueries({ queryKey: ["runs", projectId] });
}
