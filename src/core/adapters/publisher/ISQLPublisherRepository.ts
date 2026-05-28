import {
  CreatePublisherJobInput,
  PublisherJobDetail,
  PublisherJobRow,
  PublisherListResult,
  PublisherRunRow,
  PublisherRunStatus,
  UpdatePublisherRunSnapshotsInput,
  UpdatePublisherRunStatusInput,
} from 'src/core/entitis/publisher/PublisherTypes';

export interface ISQLPublisherRepository {
  createJob(input: CreatePublisherJobInput): Promise<PublisherJobDetail>;
  getJob(jobId: string): Promise<PublisherJobDetail | null>;
  listJobs(params: {
    status?: string;
    limit: number;
    offset: number;
  }): Promise<PublisherListResult<PublisherJobRow>>;
  listRuns(params: {
    status?: PublisherRunStatus;
    limit: number;
  }): Promise<{ items: PublisherRunRow[] }>;
  getRun(runId: string): Promise<PublisherRunRow | null>;
  updateRunStatus(
    runId: string,
    input: UpdatePublisherRunStatusInput,
  ): Promise<PublisherRunRow | null>;
  updateRunSnapshots(
    runId: string,
    input: UpdatePublisherRunSnapshotsInput,
  ): Promise<PublisherRunRow | null>;
  retryRun(runId: string): Promise<PublisherRunRow | null>;
  cancelJob(jobId: string): Promise<PublisherJobDetail | null>;
}
