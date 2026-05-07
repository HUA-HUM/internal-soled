import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import type { ISQLMeliProductsRepository } from 'src/core/adapters/mercadolibre/products/ISQLMeliProductsRepository';
import { MeliProductRow } from 'src/core/entitis/mercadolibre/products/MeliProductRow';
import {
  MeliProductDTO,
  PaginatedResult,
  PaginationOptions,
} from 'src/core/entitis/mercadolibre/products/dto/MeliProductDTO';
import { EntityManager } from 'typeorm';

const PRODUCT_COLUMNS = [
  'meli_item_id',
  'seller_id',
  'sku',
  'title',
  'description',
  'condition_type',
  'status',
  'permalink',
  'price',
  'base_price',
  'original_price',
  'available_quantity',
  'sold_quantity',
  'listing_type_id',
  'buying_mode',
  'catalog_listing',
  'category_id',
  'category_name',
  'category_path',
  'domain_id',
  'brand',
  'model',
  'gtin',
  'attributes',
  'thumbnail',
  'pictures',
  'video_id',
  'logistic_type',
  'shipping_mode',
  'free_shipping',
  'local_pick_up',
  'has_variations',
  'variations',
  'raw_payload',
  'last_webhook_at',
  'last_seen_at',
] as const;

const JSON_COLUMNS = new Set<string>([
  'category_path',
  'attributes',
  'pictures',
  'variations',
  'raw_payload',
]);

type ProductColumn = (typeof PRODUCT_COLUMNS)[number];

@Injectable()
export class SQLMeliProductsRepository implements ISQLMeliProductsRepository {
  private readonly productColumns = new Set<string>(PRODUCT_COLUMNS);

  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async bulkUpsertProducts(products: MeliProductDTO[]): Promise<number> {
    await this.entityManager.transaction(async (manager) => {
      for (const product of products) {
        await this.upsertProduct(manager, product);
      }
    });

    return products.length;
  }

  async updateProductField(
    meliItemId: string,
    field: string,
    value: unknown,
  ): Promise<void> {
    const column = this.assertProductColumn(field);
    const normalizedValue = this.normalizeValue(column, value);

    await this.entityManager.query(
      `
      UPDATE mercadolibre_products
      SET ${column} = ?, updated_at = NOW()
      WHERE meli_item_id = ?
      `,
      [normalizedValue, meliItemId],
    );
  }

  async clearProductField(meliItemId: string, field: string): Promise<void> {
    const column = this.assertProductColumn(field);

    await this.entityManager.query(
      `
      UPDATE mercadolibre_products
      SET ${column} = NULL, updated_at = NOW()
      WHERE meli_item_id = ?
      `,
      [meliItemId],
    );
  }

  async getProducts(
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<MeliProductRow>> {
    const offset = this.getOffset(pagination);

    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT *
      FROM mercadolibre_products
      ORDER BY updated_at DESC, id DESC
      LIMIT ? OFFSET ?
      `,
      [pagination.limit, offset],
    );
    const rows = queryResult as MeliProductRow[];

    const total = await this.countAllProducts();

    return this.toPaginatedResult(rows, pagination, total);
  }

  async findProduct(identifier: string): Promise<MeliProductRow | null> {
    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT *
      FROM mercadolibre_products
      WHERE meli_item_id = ? OR sku = ?
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
      `,
      [identifier, identifier],
    );
    const rows = queryResult as MeliProductRow[];

    return rows.length ? rows[0] : null;
  }

  async getSkus(
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<string>> {
    const offset = this.getOffset(pagination);

    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT sku
      FROM mercadolibre_products
      WHERE sku IS NOT NULL AND sku <> ''
      ORDER BY sku ASC
      LIMIT ? OFFSET ?
      `,
      [pagination.limit, offset],
    );
    const rows = queryResult as { sku: string }[];

    const total = await this.countColumnValues('sku');

    return this.toPaginatedResult(
      rows.map((row) => row.sku),
      pagination,
      total,
    );
  }

  async getMlas(
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<string>> {
    const offset = this.getOffset(pagination);

    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT meli_item_id
      FROM mercadolibre_products
      WHERE meli_item_id IS NOT NULL AND meli_item_id <> ''
      ORDER BY meli_item_id ASC
      LIMIT ? OFFSET ?
      `,
      [pagination.limit, offset],
    );
    const rows = queryResult as { meli_item_id: string }[];

    const total = await this.countColumnValues('meli_item_id');

    return this.toPaginatedResult(
      rows.map((row) => row.meli_item_id),
      pagination,
      total,
    );
  }

  private async upsertProduct(
    manager: EntityManager,
    product: MeliProductDTO,
  ): Promise<void> {
    const columns = PRODUCT_COLUMNS.filter(
      (column) => product[column] !== undefined,
    );

    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((column) =>
      this.normalizeValue(column, product[column]),
    );
    const updates = columns
      .filter((column) => column !== 'meli_item_id')
      .map((column) => `${column} = VALUES(${column})`)
      .join(', ');
    const updateClause = updates
      ? `${updates}, updated_at = NOW()`
      : 'updated_at = NOW()';

    await manager.query(
      `
      INSERT INTO mercadolibre_products (${columns.join(', ')})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE ${updateClause}
      `,
      values,
    );
  }

  private assertProductColumn(field: string): ProductColumn {
    if (!this.productColumns.has(field) || field === 'meli_item_id') {
      throw new Error(`Invalid product field: ${field}`);
    }

    return field as ProductColumn;
  }

  private normalizeValue(column: ProductColumn, value: unknown): unknown {
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

    return value;
  }

  private getOffset(pagination: PaginationOptions): number {
    return (pagination.page - 1) * pagination.limit;
  }

  private async countAllProducts(): Promise<number> {
    const queryResult: unknown = await this.entityManager.query(`
      SELECT COUNT(*) AS total
      FROM mercadolibre_products
    `);
    const rows = queryResult as { total: string | number }[];

    return Number(rows[0]?.total ?? 0);
  }

  private async countColumnValues(column: ProductColumn): Promise<number> {
    const queryResult: unknown = await this.entityManager.query(`
      SELECT COUNT(*) AS total
      FROM mercadolibre_products
      WHERE ${column} IS NOT NULL AND ${column} <> ''
    `);
    const rows = queryResult as { total: string | number }[];

    return Number(rows[0]?.total ?? 0);
  }

  private toPaginatedResult<T>(
    data: T[],
    pagination: PaginationOptions,
    total: number,
  ): PaginatedResult<T> {
    return {
      data,
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }
}
