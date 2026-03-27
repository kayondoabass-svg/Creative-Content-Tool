import { randomUUID } from "crypto";

export type JobStatus = "queued" | "processing" | "complete" | "error";

export interface Job {
  id: string;
  status: JobStatus;
  queuePosition: number;
  step: string;
  percent: number;
  result?: any;
  error?: string;
  limitReached?: boolean;
  limitType?: string;
  createdAt: number;
  updatedAt: number;
}

class JobQueue {
  private jobs = new Map<string, Job>();
  private queue: Array<{ jobId: string; fn: () => Promise<any> }> = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent = 20) {
    this.maxConcurrent = maxConcurrent;
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  createJob(): string {
    const id = randomUUID();
    const position = this.queue.length + 1;
    this.jobs.set(id, {
      id,
      status: "queued",
      queuePosition: position,
      step: position > 1 ? `You are #${position} in queue — almost there!` : "Starting up...",
      percent: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return id;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  updateJob(id: string, updates: Partial<Job>) {
    const job = this.jobs.get(id);
    if (job) {
      Object.assign(job, updates, { updatedAt: Date.now() });
    }
  }

  async enqueue(jobId: string, fn: () => Promise<any>): Promise<void> {
    this.queue.push({ jobId, fn });
    this.updateQueuePositions();
    this.processNext();
  }

  private updateQueuePositions() {
    this.queue.forEach((item, idx) => {
      const pos = idx + 1;
      this.updateJob(item.jobId, {
        queuePosition: pos,
        step: `You are #${pos} in queue — almost there!`,
      });
    });
  }

  private async processNext() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return;

    const item = this.queue.shift()!;
    this.running++;
    this.updateQueuePositions();

    this.updateJob(item.jobId, {
      status: "processing",
      step: "AI is working on your content...",
      percent: 8,
      queuePosition: 0,
    });

    // 5-minute timeout failsafe — marks the job as failed if AI hangs
    const JOB_TIMEOUT_MS = 5 * 60 * 1000;
    const timeoutHandle = setTimeout(() => {
      const job = this.jobs.get(item.jobId);
      if (job && job.status === "processing") {
        this.updateJob(item.jobId, {
          status: "error",
          step: "Generation timed out — please try again",
          error: "The AI took too long to respond. Please try again.",
          percent: 0,
        });
      }
    }, JOB_TIMEOUT_MS);

    try {
      const result = await item.fn();
      clearTimeout(timeoutHandle);
      this.updateJob(item.jobId, {
        status: "complete",
        step: "Content ready!",
        percent: 100,
        result: result?.data,
        limitReached: result?.limitReached,
        limitType: result?.limitType,
        error: result?.error,
      });
    } catch (err: any) {
      clearTimeout(timeoutHandle);
      this.updateJob(item.jobId, {
        status: "error",
        step: "Generation failed",
        error: err.message || "Something went wrong",
        percent: 0,
      });
    } finally {
      this.running--;
      this.processNext();
    }
  }

  private cleanup() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000;
    for (const [id, job] of this.jobs.entries()) {
      if (now - job.createdAt > maxAge) {
        this.jobs.delete(id);
      }
    }
  }

  get stats() {
    return {
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      totalJobs: this.jobs.size,
    };
  }
}

export const jobQueue = new JobQueue(20);
