import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ISQLMarketplacePublicationsRepository } from 'src/core/adapters/marketplace-publications/ISQLMarketplacePublicationsRepository';
import {
  MarketplacePublicationListResult,
  MarketplacePublicationRow,
  MarketplacePublicationSkuStatusResult,
  MarketplacePublicationStatus,
  MarketplaceSkuStatusFacetsResult,
  MarketplaceSkuStatusFilters,
  MarketplaceSkuStatusSortBy,
  MarketplaceStockFilter,
  MissingMarketplacePublicationsResult,
} from 'src/core/entitis/marketplace-publications/MarketplacePublicationTypes';
import {
  MarketplacePublicationSkuStatusQueryDTO,
  UpdateMarketplacePublicationPriceDTO,
  UpdateMarketplacePublicationStatusDTO,
  UpdateMarketplacePublicationStockDTO,
  UpsertMarketplacePublicationDTO,
} from 'src/app/controller/marketplace-publications/internal/dto/MarketplacePublicationDTO';

/** Sin limit explicito igual paginamos: "sin filtro" nunca debe significar "sin limite". */
const DEFAULT_PUBLICATIONS_LIMIT = 200;

const LISTING_TYPE_ALIASES: Record<string, string> = {
  clasica: 'gold_special',
  clásica: 'gold_special',
  classic: 'gold_special',
  gold_special: 'gold_special',
  cuotas: 'gold_pro',
  premium: 'gold_pro',
  gold_pro: 'gold_pro',
  gratuita: 'free',
  free: 'free',
};

const STOCK_ALIASES: Record<string, MarketplaceStockFilter> = {
  in_stock: 'in_stock',
  con_stock: 'in_stock',
  disponible: 'in_stock',
  true: 'in_stock',
  out_of_stock: 'out_of_stock',
  sin_stock: 'out_of_stock',
  no_disponible: 'out_of_stock',
  false: 'out_of_stock',
};

const SORT_BY_VALUES = new Set<string>([
  'price',
  'stock',
  'title',
  'sku',
  'updated_at',
]);

@Injectable()
export class MarketplacePublicationsService {
  constructor(
    @Inject('ISQLMarketplacePublicationsRepository')
    private readonly publicationsRepository: ISQLMarketplacePublicationsRepository,
  ) {}

  async getPublication(
    marketplace: string,
    sku: string,
  ): Promise<MarketplacePublicationRow> {
    const publication = await this.publicationsRepository.getPublication(
      marketplace,
      sku,
    );

    if (!publication) {
      throw new NotFoundException('Marketplace publication not found');
    }

    return publication;
  }

  listPublications(params: {
    sku?: string;
    marketplace?: string;
    status?: MarketplacePublicationStatus;
    limit?: number;
    offset?: number;
  }): Promise<MarketplacePublicationListResult> {
    return this.publicationsRepository.listPublications({
      sku: params.sku,
      marketplace: params.marketplace,
      status: params.status,
      limit: params.limit ?? DEFAULT_PUBLICATIONS_LIMIT,
      offset: params.offset ?? 0,
    });
  }

  listMissingPublications(params: {
    marketplace: string;
    limit?: number;
    offset?: number;
  }): Promise<MissingMarketplacePublicationsResult> {
    return this.publicationsRepository.listMissingPublications({
      marketplace: params.marketplace,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    });
  }

  listSkuPublicationStatus(
    query: MarketplacePublicationSkuStatusQueryDTO,
  ): Promise<MarketplacePublicationSkuStatusResult> {
    return this.publicationsRepository.listSkuPublicationStatus(
      this.buildSkuStatusFilters(query),
    );
  }

  getSkuPublicationFacets(): Promise<MarketplaceSkuStatusFacetsResult> {
    return this.publicationsRepository.getSkuPublicationFacets();
  }

  private buildSkuStatusFilters(
    query: MarketplacePublicationSkuStatusQueryDTO,
  ): MarketplaceSkuStatusFilters {
    return {
      sku: query.sku?.trim() || undefined,
      search: query.search?.trim() || undefined,
      marketplaces: this.parseList(query.marketplaces),
      listingTypes: this.parseListingTypes(query.listingType),
      statuses: this.parseList(query.status),
      active: this.parseBoolean(query.active),
      brands: this.parseList(query.brand),
      categories: this.parseList(query.category),
      stock: this.parseStock(query.stock),
      publishedIn: this.parseList(query.publishedIn),
      notPublishedIn: this.parseList(query.notPublishedIn),
      publishedMatch: query.publishedMatch === 'all' ? 'all' : 'any',
      published: this.parseBoolean(query.published),
      sortBy: this.parseSortBy(query.sortBy),
      sortDir: query.sortDir === 'asc' ? 'asc' : 'desc',
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    };
  }

  private parseList(value?: string): string[] {
    if (!value) {
      return [];
    }

    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private parseListingTypes(value?: string): string[] {
    const listingTypes = new Set<string>();

    for (const item of this.parseList(value)) {
      const normalized = LISTING_TYPE_ALIASES[item.toLowerCase()];

      if (!normalized) {
        throw new BadRequestException(
          `listingType invalido: ${item}. Valores validos: clasica, cuotas, gratuita.`,
        );
      }

      listingTypes.add(normalized);
    }

    return Array.from(listingTypes);
  }

  private parseStock(value?: string): MarketplaceStockFilter | undefined {
    if (!value) {
      return undefined;
    }

    const stock = STOCK_ALIASES[value.trim().toLowerCase()];

    if (!stock) {
      throw new BadRequestException(
        `stock invalido: ${value}. Valores validos: in_stock, out_of_stock.`,
      );
    }

    return stock;
  }

  private parseSortBy(value?: string): MarketplaceSkuStatusSortBy {
    const sortBy = value?.trim().toLowerCase();

    return sortBy && SORT_BY_VALUES.has(sortBy)
      ? (sortBy as MarketplaceSkuStatusSortBy)
      : 'updated_at';
  }

  private parseBoolean(value?: string | boolean): boolean | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    const normalized = value.trim().toLowerCase();

    if (['true', '1', 'si', 'yes', 'activo'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no', 'inactivo'].includes(normalized)) {
      return false;
    }

    return undefined;
  }

  async upsertPublication(
    marketplace: string,
    sku: string,
    body: UpsertMarketplacePublicationDTO,
  ): Promise<{ ok: true; id: number; sku: string; marketplace: string }> {
    const publication = await this.publicationsRepository.upsertPublication({
      sku,
      marketplace,
      source: body.source ?? 'mercadolibre',
      meli_item_id: body.meliItemId,
      external_product_id: body.externalProductId,
      external_sku: body.externalSku,
      external_url: body.externalUrl,
      publication_status: body.publicationStatus,
      sync_status: body.syncStatus,
      title: body.title,
      description: body.description,
      brand: body.brand,
      model: body.model,
      gtin: body.gtin,
      category_id: body.categoryId,
      category_name: body.categoryName,
      category_path: body.categoryPath,
      list_price: body.listPrice,
      sale_price: body.salePrice,
      net_price: body.netPrice,
      discount_percentage: body.discountPercentage,
      stock: body.stock,
      currency: body.currency,
      thumbnail: body.thumbnail,
      images_json: body.images,
      attributes_json: body.attributes,
      variations_json: body.variations,
      payload_json: body.payload,
      last_response_json: body.lastResponse,
      last_job_id: body.lastJobId,
      last_run_id: body.lastRunId,
      last_published_at:
        body.publicationStatus === 'published' ? new Date() : undefined,
      last_synced_at: body.syncStatus === 'synced' ? new Date() : undefined,
      last_error_at: body.syncStatus === 'failed' ? new Date() : undefined,
    });

    return {
      ok: true,
      id: publication.id,
      sku: publication.sku,
      marketplace: publication.marketplace,
    };
  }

  async updateStatus(
    marketplace: string,
    sku: string,
    body: UpdateMarketplacePublicationStatusDTO,
  ): Promise<{ ok: true }> {
    const publication = await this.publicationsRepository.updateStatus({
      marketplace,
      sku,
      publicationStatus: body.publicationStatus,
      syncStatus: body.syncStatus,
      lastErrorMessage: body.lastErrorMessage,
    });

    if (!publication) {
      throw new NotFoundException('Marketplace publication not found');
    }

    return { ok: true };
  }

  async updatePrice(
    marketplace: string,
    sku: string,
    body: UpdateMarketplacePublicationPriceDTO,
  ): Promise<{ ok: true }> {
    const publication = await this.publicationsRepository.updatePrice({
      marketplace,
      sku,
      listPrice: body.listPrice,
      salePrice: body.salePrice,
      netPrice: body.netPrice,
      discountPercentage: body.discountPercentage,
      currency: body.currency,
    });

    if (!publication) {
      throw new NotFoundException('Marketplace publication not found');
    }

    return { ok: true };
  }

  async updateStock(
    marketplace: string,
    sku: string,
    body: UpdateMarketplacePublicationStockDTO,
  ): Promise<{ ok: true }> {
    const publication = await this.publicationsRepository.updateStock({
      marketplace,
      sku,
      stock: body.stock,
    });

    if (!publication) {
      throw new NotFoundException('Marketplace publication not found');
    }

    return { ok: true };
  }
}
