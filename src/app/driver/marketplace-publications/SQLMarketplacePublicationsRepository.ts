import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import type { ISQLMarketplacePublicationsRepository } from 'src/core/adapters/marketplace-publications/ISQLMarketplacePublicationsRepository';
import {
  MarketplacePublicationListResult,
  MarketplacePublicationRow,
  UpsertMarketplacePublicationInput,
} from 'src/core/entitis/marketplace-publications/MarketplacePublicationTypes';
import { EntityManager } from 'typeorm';

const PUBLICATION_COLUMNS = [
  'sku',
  'marketplace',
  'source',
  'meli_item_id',
  'external_product_id',
  'external_sku',
  'external_url',
  'publication_status',
  'sync_status',
  'title',
  'description',
  'brand',
  'model',
  'gtin',
  'category_id',
  'category_name',
  'category_path',
  'list_price',
  'sale_price',
  'net_price',
  'discount_percentage',
  'stock',
  'currency',
  'thumbnail',
  'images_json',
  'attributes_json',
  'variations_json',
  'payload_json',
  'last_response_json',
  'last_job_id',
  'last_run_id',
  'last_published_at',
  'last_synced_at',
  'last_error_at',
  'last_error_message',
] as const;

const JSON_COLUMNS = new Set<string>([
  'category_path',
  'images_json',
  'attributes_json',
  'variations_json',
  'payload_json',
  'last_response_json',
]);

const DATETIME_COLUMNS = new Set<string>([
  'last_published_at',
  'last_synced_at',
  'last_error_at',
]);

type PublicationColumn = (typeof PUBLICATION_COLUMNS)[number];

@Injectable()
export class SQLMarketplacePublicationsRepository implements ISQLMarketplacePublicationsRepository {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async getPublication(
    marketplace: string,
    sku: string,
  ): Promise<MarketplacePublicationRow | null> {
    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT *
      FROM marketplace_product_publications
      WHERE marketplace = ? AND sku = ?
      LIMIT 1
      `,
      [marketplace, sku],
    );
    const rows = queryResult as MarketplacePublicationRow[];

    return rows.length ? rows[0] : null;
  }

  async listPublications(params: {
    sku?: string;
  }): Promise<MarketplacePublicationListResult> {
    const whereSql = params.sku ? 'WHERE sku = ?' : '';
    const queryParams = params.sku ? [params.sku] : [];

    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT *
      FROM marketplace_product_publications
      ${whereSql}
      ORDER BY updated_at DESC, id DESC
      `,
      queryParams,
    );

    return {
      items: queryResult as MarketplacePublicationRow[],
    };
  }

  async upsertPublication(
    input: UpsertMarketplacePublicationInput,
  ): Promise<MarketplacePublicationRow> {
    const data = this.toDatabaseInput(input);
    const columns = PUBLICATION_COLUMNS.filter(
      (column) => data[column] !== undefined,
    );
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((column) =>
      this.normalizeValue(column, data[column]),
    );
    const updates = columns
      .filter((column) => column !== 'sku' && column !== 'marketplace')
      .map((column) => `${column} = VALUES(${column})`)
      .join(', ');

    await this.entityManager.query(
      `
      INSERT INTO marketplace_product_publications (${columns.join(', ')})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE
        ${updates ? `${updates},` : ''}
        updated_at = NOW()
      `,
      values,
    );

    const publication = await this.getPublication(input.marketplace, input.sku);

    if (!publication) {
      throw new Error(
        `[SQLMarketplacePublicationsRepository] Publication was not saved: ${input.marketplace}/${input.sku}`,
      );
    }

    return publication;
  }

  async updateStatus(params: {
    marketplace: string;
    sku: string;
    publicationStatus?: MarketplacePublicationRow['publication_status'];
    syncStatus?: MarketplacePublicationRow['sync_status'];
    lastErrorMessage?: string | null;
  }): Promise<MarketplacePublicationRow | null> {
    await this.entityManager.query(
      `
      UPDATE marketplace_product_publications
      SET
        publication_status = COALESCE(?, publication_status),
        sync_status = COALESCE(?, sync_status),
        last_error_message = ?,
        last_error_at = CASE WHEN ? IS NOT NULL THEN NOW() ELSE last_error_at END,
        last_synced_at = CASE WHEN ? = 'synced' THEN NOW() ELSE last_synced_at END
      WHERE marketplace = ? AND sku = ?
      `,
      [
        params.publicationStatus ?? null,
        params.syncStatus ?? null,
        params.lastErrorMessage ?? null,
        params.lastErrorMessage ?? null,
        params.syncStatus ?? null,
        params.marketplace,
        params.sku,
      ],
    );

    return this.getPublication(params.marketplace, params.sku);
  }

  async updatePrice(params: {
    marketplace: string;
    sku: string;
    listPrice?: number | null;
    salePrice?: number | null;
    netPrice?: number | null;
    discountPercentage?: number | null;
    currency?: string;
  }): Promise<MarketplacePublicationRow | null> {
    await this.entityManager.query(
      `
      UPDATE marketplace_product_publications
      SET
        list_price = ?,
        sale_price = ?,
        net_price = ?,
        discount_percentage = ?,
        currency = COALESCE(?, currency),
        sync_status = 'pending'
      WHERE marketplace = ? AND sku = ?
      `,
      [
        params.listPrice ?? null,
        params.salePrice ?? null,
        params.netPrice ?? null,
        params.discountPercentage ?? null,
        params.currency ?? null,
        params.marketplace,
        params.sku,
      ],
    );

    return this.getPublication(params.marketplace, params.sku);
  }

  async updateStock(params: {
    marketplace: string;
    sku: string;
    stock: number;
  }): Promise<MarketplacePublicationRow | null> {
    await this.entityManager.query(
      `
      UPDATE marketplace_product_publications
      SET stock = ?, sync_status = 'pending'
      WHERE marketplace = ? AND sku = ?
      `,
      [params.stock, params.marketplace, params.sku],
    );

    return this.getPublication(params.marketplace, params.sku);
  }

  private toDatabaseInput(
    input: UpsertMarketplacePublicationInput,
  ): Partial<Record<PublicationColumn, unknown>> {
    return {
      sku: input.sku,
      marketplace: input.marketplace,
      source: input.source ?? 'mercadolibre',
      meli_item_id: input.meli_item_id,
      external_product_id: input.external_product_id,
      external_sku: input.external_sku,
      external_url: input.external_url,
      publication_status: input.publication_status ?? 'draft',
      sync_status: input.sync_status ?? 'pending',
      title: input.title,
      description: input.description,
      brand: input.brand,
      model: input.model,
      gtin: input.gtin,
      category_id: input.category_id,
      category_name: input.category_name,
      category_path: input.category_path,
      list_price: input.list_price,
      sale_price: input.sale_price,
      net_price: input.net_price,
      discount_percentage: input.discount_percentage,
      stock: input.stock,
      currency: input.currency ?? 'ARS',
      thumbnail: input.thumbnail,
      images_json: input.images_json,
      attributes_json: input.attributes_json,
      variations_json: input.variations_json,
      payload_json: input.payload_json,
      last_response_json: input.last_response_json,
      last_job_id: input.last_job_id,
      last_run_id: input.last_run_id,
      last_published_at: input.last_published_at,
      last_synced_at: input.last_synced_at,
      last_error_at: input.last_error_at,
      last_error_message: input.last_error_message,
    };
  }

  private normalizeValue(column: PublicationColumn, value: unknown): unknown {
    if (value === undefined) {
      return null;
    }

    if (
      JSON_COLUMNS.has(column) &&
      value !== null &&
      typeof value !== 'string'
    ) {
      return JSON.stringify(value);
    }

    if (DATETIME_COLUMNS.has(column)) {
      return this.normalizeDateTimeValue(value);
    }

    return value;
  }

  private normalizeDateTimeValue(value: unknown): unknown {
    if (value === null) {
      return null;
    }

    if (value instanceof Date) {
      return this.toMySqlDateTime(value);
    }

    if (typeof value === 'string') {
      if (value.trim() === '') {
        return null;
      }

      const date = new Date(value);

      if (!Number.isNaN(date.getTime())) {
        return this.toMySqlDateTime(date);
      }
    }

    return value;
  }

  private toMySqlDateTime(date: Date): string {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }
}
