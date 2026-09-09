import {
  CreateProcessRunInput,
  FinishProcessRunInput,
  ProcessRunAnalyticsFilters,
  ProcessRunAnalyticsResult,
  ProcessRunDTO,
  ProcessRunFilters,
  ProcessRunListResult,
} from 'src/core/entitis/process-runs/ProcessRunTypes';

export interface ISQLProcessRunsRepository {
  create(input: CreateProcessRunInput): Promise<ProcessRunDTO>;
  finish(
    id: number,
    input: FinishProcessRunInput,
  ): Promise<ProcessRunDTO | null>;
  list(params: {
    filters: ProcessRunFilters;
    limit: number;
    offset: number;
  }): Promise<ProcessRunListResult>;
  getAnalytics(
    filters: ProcessRunAnalyticsFilters,
  ): Promise<ProcessRunAnalyticsResult>;
}
