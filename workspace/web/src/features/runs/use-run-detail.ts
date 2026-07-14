import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { RunJob } from "../../types/module";

/** 打开运行详情时轮询 job；running 状态 1s 刷新日志，结束后停止 */
export function useRunDetail(jobId: string | undefined): RunJob | null {
  const [job, setJob] = useState<RunJob | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const refresh = async () => {
      try {
        const next = await api.getRun(jobId);
        if (!active) return;
        setJob(next);
        if (next.status !== "running" && timer) {
          clearInterval(timer);
          timer = undefined;
        }
      } catch {
        if (active) setJob(null);
      }
    };

    void refresh();
    timer = setInterval(() => void refresh(), 1000);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [jobId]);

  return job;
}
