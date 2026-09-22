export type CoresaPublicationStatus =
  | 'draft'
  | 'ready'
  | 'publishing'
  | 'published'
  | 'partial'
  | 'failed'
  | 'discarded';

export type CoresaPublicationRow = {
  id: number;
  sku: string;
  status: CoresaPublicationStatus;
  requested_by: string | null;
  coresa_snapshot: unknown;
  draft_json: unknown;
  ai_model: string | null;
  ai_generated_at: Date | string | null;
  category_id: string | null;
  validation_json: unknown;
  classic_item_id: string | null;
  premium_item_id: string | null;
  permalink: string | null;
  response_json: unknown;
  error_code: string | null;
  error_message: string | null;
  published_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type CoresaPublicationDTO = {
  id: number;
  sku: string;
  status: CoresaPublicationStatus;
  requestedBy: string | null;
  coresaSnapshot: unknown;
  draft: unknown;
  aiModel: string | null;
  aiGeneratedAt: string | null;
  categoryId: string | null;
  validation: unknown;
  classicItemId: string | null;
  premiumItemId: string | null;
  permalink: string | null;
  response: unknown;
  errorCode: string | null;
  errorMessage: string | null;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreateCoresaPublicationInput = {
  sku: string;
  requestedBy?: string | null;
  coresaSnapshot?: unknown;
  draft?: unknown;
  categoryId?: string | null;
  aiModel?: string | null;
  aiGeneratedAt?: string | null;
};

/**
 * Solo las claves presentes se escriben. Un valor null explicito limpia la
 * columna; undefined la deja como estaba.
 */
export type UpdateCoresaPublicationInput = {
  status?: CoresaPublicationStatus;
  draft?: unknown;
  coresaSnapshot?: unknown;
  categoryId?: string | null;
  aiModel?: string | null;
  aiGeneratedAt?: string | null;
  validation?: unknown;
  classicItemId?: string | null;
  premiumItemId?: string | null;
  permalink?: string | null;
  response?: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
  publishedAt?: string | null;
};

export type CoresaPublicationFilters = {
  sku?: string;
  status?: CoresaPublicationStatus;
  categoryId?: string;
  from?: string;
  to?: string;
};

export type CoresaPublicationListResult = {
  items: CoresaPublicationDTO[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};
