export type CoresaSyncChangeSource = 'cron' | 'manual';

/**
 * updated      se mando y ML lo aplico
 * not_applied  se mando, ML respondio OK, pero el valor no cambio
 * failed       ML lo rechazo o hubo error de red
 */
export type CoresaSyncChangeResult = 'updated' | 'not_applied' | 'failed';

export type CoresaSyncChangeRow = {
  id: number;
  run_id: number | null;
  sku: string;
  mla: string;
  source: CoresaSyncChangeSource;
  result: CoresaSyncChangeResult;
  price_before: number | null;
  price_requested: number | null;
  price_applied: number | null;
  stock_before: number | null;
  stock_requested: number | null;
  stock_applied: number | null;
  meli_status: string | null;
  meli_sub_status: unknown;
  error_code: string | null;
  error_message: string | null;
  created_at: Date | string;
};

export type CoresaSyncChangeDTO = {
  id: number;
  runId: number | null;
  sku: string;
  mla: string;
  source: CoresaSyncChangeSource;
  result: CoresaSyncChangeResult;
  priceBefore: number | null;
  priceRequested: number | null;
  priceApplied: number | null;
  stockBefore: number | null;
  stockRequested: number | null;
  stockApplied: number | null;
  meliStatus: string | null;
  meliSubStatus: unknown;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string | null;
};

/** Los campos de precio y de stock van undefined cuando esa actualizacion no tocaba ese campo. */
export type CreateCoresaSyncChangeInput = {
  runId?: number | null;
  sku: string;
  mla: string;
  source: CoresaSyncChangeSource;
  result: CoresaSyncChangeResult;
  priceBefore?: number | null;
  priceRequested?: number | null;
  priceApplied?: number | null;
  stockBefore?: number | null;
  stockRequested?: number | null;
  stockApplied?: number | null;
  meliStatus?: string | null;
  meliSubStatus?: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type CoresaSyncChangeFilters = {
  sku?: string;
  mla?: string;
  result?: CoresaSyncChangeResult;
  runId?: number;
  from?: string;
  to?: string;
};

export type CoresaSyncChangeListResult = {
  items: CoresaSyncChangeDTO[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type CoresaSyncChangeStatsResult = {
  from: string;
  to: string;
  updated: number;
  notApplied: number;
  failed: number;
  total: number;
  byDay: {
    date: string;
    updated: number;
    notApplied: number;
    failed: number;
  }[];
};
