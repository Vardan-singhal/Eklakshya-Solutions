type Job = {
  start: (finish: () => void) => void;
  priority: boolean;
  cancelled: boolean;
  finish?: () => void;
};

/** Background preparation is serial; approaching models can use a second slot. */
export function createModelPreparationQueue(schedule: (run: () => void) => () => void) {
  const pending: Job[] = [];
  const running = new Set<Job>();
  let cancelScheduled: (() => void) | null = null;
  const pump = () => {
    if (cancelScheduled || !pending.length) return;
    const priority = pending.some((job) => job.priority);
    if (running.size >= (priority ? 2 : 1)) return;
    cancelScheduled = schedule(() => {
      cancelScheduled = null;
      const priorityIndex = pending.findIndex((job) => job.priority);
      const index = priorityIndex < 0 ? 0 : priorityIndex;
      const job = pending[index];
      if (!job || running.size >= (job.priority ? 2 : 1)) return;
      pending.splice(index, 1);
      if (job.cancelled) { pump(); return; }
      running.add(job);
      job.finish = () => { if (running.delete(job)) pump(); };
      job.start(job.finish);
      pump();
    });
  };
  return {
    enqueue(start: Job["start"], priority = false) {
      const job: Job = { start, priority, cancelled: false };
      pending.push(job);
      pump();
      return {
        prioritize(value: boolean) { job.priority = value; pump(); },
        cancel() {
          job.cancelled = true;
          const index = pending.indexOf(job);
          if (index >= 0) pending.splice(index, 1);
          job.finish?.();
          if (!pending.length && cancelScheduled) { cancelScheduled(); cancelScheduled = null; }
        },
      };
    },
  };
}
