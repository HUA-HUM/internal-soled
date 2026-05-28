import {
  MarketplacePublicationListResult,
  MarketplacePublicationRow,
  MarketplacePublicationStatus,
  MarketplacePublicationSyncStatus,
  UpsertMarketplacePublicationInput,
} from 'src/core/entitis/marketplace-publications/MarketplacePublicationTypes';

export interface ISQLMarketplacePublicationsRepository {
  getPublication(
    marketplace: string,
    sku: string,
  ): Promise<MarketplacePublicationRow | null>;
  listPublications(params: {
    sku?: string;
  }): Promise<MarketplacePublicationListResult>;
  upsertPublication(
    input: UpsertMarketplacePublicationInput,
  ): Promise<MarketplacePublicationRow>;
  updateStatus(params: {
    marketplace: string;
    sku: string;
    publicationStatus?: MarketplacePublicationStatus;
    syncStatus?: MarketplacePublicationSyncStatus;
    lastErrorMessage?: string | null;
  }): Promise<MarketplacePublicationRow | null>;
  updatePrice(params: {
    marketplace: string;
    sku: string;
    listPrice?: number | null;
    salePrice?: number | null;
    netPrice?: number | null;
    discountPercentage?: number | null;
    currency?: string;
  }): Promise<MarketplacePublicationRow | null>;
  updateStock(params: {
    marketplace: string;
    sku: string;
    stock: number;
  }): Promise<MarketplacePublicationRow | null>;
}
