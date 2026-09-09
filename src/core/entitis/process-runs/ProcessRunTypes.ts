export type ProcessRunTriggerType = 'cron' | 'manual';

export type ProcessRunStatus = 'running' | 'completed' | 'failed';

export type ProcessRunRow = {
  id: number;
  process_name: string;
  trigger_type: ProcessRunTriggerType;
  status: ProcessRunStatus;
  started_at: Date | string;
  finished_at: Date | string | null;
  duration_ms: number | string | null;
  summary_json: unknown;
  error_message: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type ProcessRunDTO = {
  id: number;
  processName: string;
  triggerType: ProcessRunTriggerType;
  status: ProcessRunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  summary: unknown;
  errorMessage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreateProcessRunInput = {
  processName: string;
  triggerType: ProcessRunTriggerType;
};

export type FinishProcessRunInput = {
  status: Extract<ProcessRunStatus, 'completed' | 'failed'>;
  summary?: unknown;
  errorMessage?: string | null;
};

export type ProcessRunFilters = {
  processName?: string;
  status?: ProcessRunStatus;
  triggerType?: ProcessRunTriggerType;
  from?: string;
  to?: string;
};

export type ProcessRunListResult = {
  items: ProcessRunDTO[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type ProcessRunAnalyticsFilters = {
  processName?: string;
  from?: string;
  to?: string;
};

export type ProcessRunAnalyticsBreakdown = {
  name: string;
  total: number;
  completed: number;
  failed: number;
  running: number;
  averageDurationMs: number | null;
  lastRunAt: string | null;
};

export type ProcessRunAnalyticsResult = {
  period: {
    from: string;
    to: string;
    timezone: 'database';
  };
  filters: Omit<ProcessRunAnalyticsFilters, 'from' | 'to'>;
  summary: {
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    runningRuns: number;
    successRate: number;
    uniqueProcesses: number;
    averageDurationMs: number | null;
    minDurationMs: number | null;
    maxDurationMs: number | null;
  };
  byProcess: ProcessRunAnalyticsBreakdown[];
  byStatus: { name: string; total: number }[];
  byTriggerType: { name: string; total: number }[];
  byDay: {
    date: string;
    total: number;
    completed: number;
    failed: number;
  }[];
};
