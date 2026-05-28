export type MarketplacePublicationStatus =
  | 'draft'
  | 'pending_publish'
  | 'published'
  | 'paused'
  | 'rejected'
  | 'error'
  | 'out_of_sync'
  | 'deleted';

export type MarketplacePublicationSyncStatus =
  | 'synced'
  | 'pending'
  | 'processing'
  | 'failed';

export type MarketplacePublicationRow = {
  id: number;
  sku: string;
  marketplace: string;
  source: string;
  meli_item_id: string | null;
  external_product_id: string | null;
  external_sku: string | null;
  external_url: string | null;
  publication_status: MarketplacePublicationStatus;
  sync_status: MarketplacePublicationSyncStatus;
  title: string | null;
  description: string | null;
  brand: string | null;
  model: string | null;
  gtin: string | null;
  category_id: string | null;
  category_name: string | null;
  category_path: unknown;
  list_price: number | null;
  sale_price: number | null;
  net_price: number | null;
  discount_percentage: number | null;
  stock: number | null;
  currency: string;
  thumbnail: string | null;
  images_json: unknown;
  attributes_json: unknown;
  variations_json: unknown;
  payload_json: unknown;
  last_response_json: unknown;
  last_job_id: string | null;
  last_run_id: string | null;
  last_published_at: Date | string | null;
  last_synced_at: Date | string | null;
  last_error_at: Date | string | null;
  last_error_message: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type UpsertMarketplacePublicationInput =
  Partial<MarketplacePublicationRow> & {
    sku: string;
    marketplace: string;
  };

export type MarketplacePublicationListResult = {
  items: MarketplacePublicationRow[];
};
