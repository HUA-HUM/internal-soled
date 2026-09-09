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
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type MissingMarketplacePublicationRow = {
  sku: string;
  meli_item_id: string;
  title: string | null;
  status: string | null;
  price: number | null;
  available_quantity: number | null;
  marketplace: string;
  marketplace_publication_id: number | null;
  publication_status: MarketplacePublicationStatus | null;
  sync_status: MarketplacePublicationSyncStatus | null;
  reason: 'not_found' | 'not_published';
};

export type MissingMarketplacePublicationsResult = {
  items: MissingMarketplacePublicationRow[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type MarketplaceListingType = 'clasica' | 'cuotas' | 'gratuita';

export type MarketplaceStockFilter = 'in_stock' | 'out_of_stock';

export type MarketplaceSkuStatusSortBy =
  | 'price'
  | 'stock'
  | 'title'
  | 'sku'
  | 'updated_at';

export type MarketplaceSkuStatusSortDir = 'asc' | 'desc';

export type MarketplaceSkuStatusFilters = {
  sku?: string;
  search?: string;
  marketplaces: string[];
  listingTypes: string[];
  statuses: string[];
  active?: boolean;
  brands: string[];
  categories: string[];
  stock?: MarketplaceStockFilter;
  publishedIn: string[];
  notPublishedIn: string[];
  publishedMatch: 'any' | 'all';
  published?: boolean;
  sortBy: MarketplaceSkuStatusSortBy;
  sortDir: MarketplaceSkuStatusSortDir;
  limit: number;
  offset: number;
};

/**
 * Una fila por SKU. Los campos de display (title, price, status, thumbnail...)
 * vienen de una publicacion representativa; los campos agregados resumen todas
 * las publicaciones que el SKU tiene en Mercado Libre.
 */
export type MarketplacePublicationSkuStatusRow = {
  sku: string;
  meli_item_id: string;
  title: string | null;
  status: string | null;
  price: number | null;
  price_min: number | null;
  price_max: number | null;
  available_quantity: number | null;
  stock: number | null;
  thumbnail: string | null;
  permalink: string | null;
  brand: string | null;
  category_id: string | null;
  category_name: string | null;
  listing_type_id: string | null;
  listing_type: string | null;
  publications: number;
  active_publications: number;
  classic_publications: number;
  premium_publications: number;
  in_stock: boolean;
  is_active: boolean;
  updated_at: string | null;
} & Record<string, string | number | boolean | null>;

export type MarketplacePublicationSkuStatusResult = {
  items: MarketplacePublicationSkuStatusRow[];
  marketplaces: string[];
  filters: MarketplaceSkuStatusAppliedFilters;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type MarketplaceSkuStatusAppliedFilters = Omit<
  MarketplaceSkuStatusFilters,
  'limit' | 'offset' | 'marketplaces'
>;

export type MarketplaceSkuStatusFacetValue = {
  value: string;
  label: string;
  total: number;
};

export type MarketplaceSkuStatusFacetsResult = {
  marketplaces: string[];
  brands: MarketplaceSkuStatusFacetValue[];
  categories: MarketplaceSkuStatusFacetValue[];
  listingTypes: MarketplaceSkuStatusFacetValue[];
  statuses: MarketplaceSkuStatusFacetValue[];
  stock: MarketplaceSkuStatusFacetValue[];
  price: { min: number | null; max: number | null };
  total: number;
};
