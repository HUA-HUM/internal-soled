export type MarketplaceChangeActionStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export type MarketplaceChangeType = 'price' | 'stock' | 'status';

export type MarketplaceChangeActionMarketplace = 'oncity' | 'fravega';

export type MarketplaceChangeActionRow = {
  id: number;
  action_id: string;
  dedupe_key: string;
  source: string;
  sku: string;
  meli_item_id: string | null;
  marketplace: MarketplaceChangeActionMarketplace;
  change_type: MarketplaceChangeType;
  status: MarketplaceChangeActionStatus;
  old_value: unknown;
  new_value: unknown;
  publication_id: number | null;
  external_product_id: string | null;
  external_sku: string | null;
  attempts: number;
  max_attempts: number;
  bullmq_job_id: string | null;
  request_snapshot: unknown;
  response_snapshot: unknown;
  error_code: string | null;
  error_message: string | null;
  queued_at: Date | string | null;
  started_at: Date | string | null;
  finished_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type MarketplaceChangeActionDTO = {
  id: number;
  actionId: string;
  dedupeKey: string;
  source: string;
  sku: string;
  meliItemId: string | null;
  marketplace: MarketplaceChangeActionMarketplace;
  changeType: MarketplaceChangeType;
  status: MarketplaceChangeActionStatus;
  oldValue: unknown;
  newValue: unknown;
  publicationId: number | null;
  externalProductId: string | null;
  externalSku: string | null;
  attempts: number;
  maxAttempts: number;
  bullmqJobId: string | null;
  requestSnapshot: unknown;
  responseSnapshot: unknown;
  errorCode: string | null;
  errorMessage: string | null;
  queuedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreateMarketplaceChangeActionInput = {
  actionId: string;
  dedupeKey: string;
  source: string;
  sku: string;
  meliItemId?: string | null;
  marketplace: MarketplaceChangeActionMarketplace;
  changeType: MarketplaceChangeType;
  oldValue?: unknown;
  newValue?: unknown;
  publicationId?: number | null;
  externalProductId?: string | null;
  externalSku?: string | null;
  maxAttempts?: number;
};

export type MarketplaceChangeActionBulkItem = {
  id: number;
  actionId: string;
  dedupeKey: string;
  status: MarketplaceChangeActionStatus;
  created: boolean;
};

export type MarketplaceChangeActionFilters = {
  sku?: string;
  meliItemId?: string;
  marketplace?: MarketplaceChangeActionMarketplace;
  changeType?: MarketplaceChangeType;
  status?: MarketplaceChangeActionStatus;
  source?: string;
};

export type MarketplaceChangeActionListResult = {
  items: MarketplaceChangeActionDTO[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};
