import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ISQLMarketplacePublicationsRepository } from 'src/core/adapters/marketplace-publications/ISQLMarketplacePublicationsRepository';
import {
  MarketplacePublicationListResult,
  MarketplacePublicationRow,
  MarketplacePublicationSkuStatusResult,
  MissingMarketplacePublicationsResult,
} from 'src/core/entitis/marketplace-publications/MarketplacePublicationTypes';
import {
  UpdateMarketplacePublicationPriceDTO,
  UpdateMarketplacePublicationStatusDTO,
  UpdateMarketplacePublicationStockDTO,
  UpsertMarketplacePublicationDTO,
} from 'src/app/controller/marketplace-publications/internal/dto/MarketplacePublicationDTO';

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
  }): Promise<MarketplacePublicationListResult> {
    return this.publicationsRepository.listPublications(params);
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

  listSkuPublicationStatus(params: {
    sku?: string;
    marketplaces?: string[];
    limit?: number;
    offset?: number;
  }): Promise<MarketplacePublicationSkuStatusResult> {
    return this.publicationsRepository.listSkuPublicationStatus({
      sku: params.sku,
      marketplaces: params.marketplaces ?? [],
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    });
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
