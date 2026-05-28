export type PublisherJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'completed_with_errors'
  | 'failed'
  | 'cancelled';

export type PublisherRunStatus =
  | 'queued'
  | 'processing'
  | 'retrying'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export type PublisherRequestedBy = {
  odooUserId?: number | null;
  name?: string | null;
  email?: string | null;
};

export type CreatePublisherJobInput = {
  source: string;
  skus: string[];
  marketplaces: string[];
  requestedBy?: PublisherRequestedBy;
  options?: Record<string, unknown>;
  idempotencyKey?: string | null;
  originalRequest: Record<string, unknown>;
};

export type PublisherJobRow = {
  id: number;
  job_id: string;
  source: string;
  status: PublisherJobStatus;
  total_items: number;
  queued_items: number;
  processing_items: number;
  done_items: number;
  error_items: number;
  skipped_items: number;
  requested_by_odoo_user_id: number | null;
  requested_by_name: string | null;
  requested_by_email: string | null;
  options: unknown;
  original_request: unknown;
  idempotency_key: string | null;
  started_at: Date | string | null;
  finished_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type PublisherRunRow = {
  id: number;
  run_id: string;
  job_id: string;
  sku: string;
  marketplace: string;
  source: string;
  status: PublisherRunStatus;
  attempts: number;
  max_attempts: number;
  bullmq_job_id: string | null;
  message: string | null;
  error_message: string | null;
  error_code: string | null;
  source_product_snapshot: unknown;
  payload_snapshot: unknown;
  response_snapshot: unknown;
  marketplace_publication_id: number | null;
  external_product_id: string | null;
  started_at: Date | string | null;
  finished_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type PublisherJobDetail = PublisherJobRow & {
  progress: number;
  items: PublisherRunRow[];
};

export type PublisherListResult<T> = {
  items: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type UpdatePublisherRunStatusInput = {
  status: PublisherRunStatus;
  message?: string | null;
  bullmqJobId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  responseSnapshot?: unknown;
  marketplacePublicationId?: number | null;
  externalProductId?: string | null;
};

export type UpdatePublisherRunSnapshotsInput = {
  sourceProductSnapshot?: unknown;
  payloadSnapshot?: unknown;
  responseSnapshot?: unknown;
};
