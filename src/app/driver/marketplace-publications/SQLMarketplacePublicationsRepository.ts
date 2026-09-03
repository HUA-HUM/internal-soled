import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import type { ISQLMarketplacePublicationsRepository } from 'src/core/adapters/marketplace-publications/ISQLMarketplacePublicationsRepository';
import {
  MarketplaceListingType,
  MarketplacePublicationListResult,
  MarketplacePublicationRow,
  MarketplacePublicationSkuStatusResult,
  MarketplacePublicationSkuStatusRow,
  MarketplaceSkuStatusAppliedFilters,
  MarketplaceSkuStatusFacetsResult,
  MarketplaceSkuStatusFilters,
  MissingMarketplacePublicationsResult,
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

const DEFAULT_MARKETPLACES = ['oncity', 'fravega', 'megatone'];

const SKU_AGGREGATE_COLUMNS = `
  sku,
  COUNT(*) AS publications,
  SUM(status = 'active') AS active_publications,
  SUM(listing_type_id = 'gold_special') AS classic_publications,
  SUM(listing_type_id = 'gold_pro') AS premium_publications,
  MIN(price) AS price_min,
  MAX(price) AS price_max,
  MAX(available_quantity) AS stock,
  MAX(updated_at) AS updated_at
`;

/**
 * Un SKU puede tener varias publicaciones en Mercado Libre (clasica, premium y
 * los escalones de cuotas). Para los campos de display elegimos una sola:
 * la mas barata entre las activas, y si ninguna esta activa, la mas barata.
 */
const REPRESENTATIVE_PUBLICATION_SQL = `
  SELECT
    sku,
    meli_item_id,
    title,
    status,
    price,
    thumbnail,
    permalink,
    brand,
    category_id,
    category_name,
    listing_type_id
  FROM (
    SELECT
      mp.*,
      ROW_NUMBER() OVER (
        PARTITION BY mp.sku
        ORDER BY (mp.status = 'active') DESC, mp.price ASC, mp.id DESC
      ) AS rn
    FROM mercadolibre_products mp
    WHERE mp.sku IS NOT NULL AND mp.sku <> ''
  ) ranked
  WHERE rn = 1
`;

const PUBLISHED_EXISTS_SQL = (marketplacePlaceholders: string): string => `
  SELECT 1
  FROM marketplace_product_publications p
  WHERE p.sku = agg.sku
    AND p.marketplace IN (${marketplacePlaceholders})
    AND p.publication_status = 'published'
`;

const SKU_STATUS_SORT_COLUMNS: Record<
  MarketplaceSkuStatusFilters['sortBy'],
  string
> = {
  price: 'agg.price_min',
  stock: 'agg.stock',
  title: 'rep.title',
  sku: 'agg.sku',
  updated_at: 'agg.updated_at',
};

type SkuAggregateRow = {
  sku: string;
  publications: string | number;
  active_publications: string | number;
  classic_publications: string | number;
  premium_publications: string | number;
  price_min: string | number | null;
  price_max: string | number | null;
  stock: string | number | null;
  updated_at: string | null;
  meli_item_id: string;
  title: string | null;
  status: string | null;
  price: string | number | null;
  thumbnail: string | null;
  permalink: string | null;
  brand: string | null;
  category_id: string | null;
  category_name: string | null;
  listing_type_id: string | null;
};

const LISTING_TYPE_LABELS: Record<string, string> = {
  gold_special: 'Clasica',
  gold_pro: 'Cuotas (Premium)',
  free: 'Gratuita',
};

const LISTING_TYPE_VALUES: Record<string, MarketplaceListingType> = {
  gold_special: 'clasica',
  gold_pro: 'cuotas',
  free: 'gratuita',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  paused: 'Pausado',
  closed: 'Cerrado',
  inactive: 'Inactivo',
  under_review: 'En revision',
};

const toListingTypeLabel = (listingTypeId: string | null): string | null => {
  if (!listingTypeId) {
    return null;
  }

  return LISTING_TYPE_VALUES[listingTypeId] ?? listingTypeId;
};

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

  async listMissingPublications(params: {
    marketplace: string;
    limit: number;
    offset: number;
  }): Promise<MissingMarketplacePublicationsResult> {
    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT
        mp.sku,
        mp.meli_item_id,
        mp.title,
        mp.status,
        mp.price,
        mp.available_quantity,
        ? AS marketplace,
        pub.id AS marketplace_publication_id,
        pub.publication_status,
        pub.sync_status,
        CASE
          WHEN pub.id IS NULL THEN 'not_found'
          ELSE 'not_published'
        END AS reason
      FROM mercadolibre_products mp
      LEFT JOIN marketplace_product_publications pub
        ON pub.sku = mp.sku
       AND pub.marketplace = ?
      WHERE mp.sku IS NOT NULL
        AND mp.sku <> ''
        AND (pub.id IS NULL OR pub.publication_status <> 'published')
      ORDER BY mp.updated_at DESC, mp.id DESC
      LIMIT ? OFFSET ?
      `,
      [params.marketplace, params.marketplace, params.limit, params.offset],
    );

    const countResult: unknown = await this.entityManager.query(
      `
      SELECT COUNT(*) AS total
      FROM mercadolibre_products mp
      LEFT JOIN marketplace_product_publications pub
        ON pub.sku = mp.sku
       AND pub.marketplace = ?
      WHERE mp.sku IS NOT NULL
        AND mp.sku <> ''
        AND (pub.id IS NULL OR pub.publication_status <> 'published')
      `,
      [params.marketplace],
    );
    const countRows = countResult as { total: string | number }[];

    return {
      items: queryResult as MissingMarketplacePublicationsResult['items'],
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: Number(countRows[0]?.total ?? 0),
      },
    };
  }

  async listSkuPublicationStatus(
    params: MarketplaceSkuStatusFilters,
  ): Promise<MarketplacePublicationSkuStatusResult> {
    const marketplaces = params.marketplaces.length
      ? params.marketplaces
      : await this.getKnownMarketplaces();
    const inner = this.buildSkuStatusInnerFilters(params);
    const having = this.buildSkuStatusHaving(params);
    const outer = this.buildSkuStatusMarketplaceFilters(params, marketplaces);
    const aggregateSql = `
      SELECT ${SKU_AGGREGATE_COLUMNS}
      FROM mercadolibre_products
      WHERE sku IS NOT NULL AND sku <> ''
        ${inner.sql}
      GROUP BY sku
      ${having.sql}
    `;
    const aggregateParams = [...inner.params, ...having.params];
    const orderBySql = `${SKU_STATUS_SORT_COLUMNS[params.sortBy]} ${
      params.sortDir === 'asc' ? 'ASC' : 'DESC'
    }`;

    const productsResult: unknown = await this.entityManager.query(
      `
      SELECT
        agg.sku,
        agg.publications,
        agg.active_publications,
        agg.classic_publications,
        agg.premium_publications,
        agg.price_min,
        agg.price_max,
        agg.stock,
        DATE_FORMAT(agg.updated_at, '%Y-%m-%dT%H:%i:%s') AS updated_at,
        rep.meli_item_id,
        rep.title,
        rep.status,
        rep.price,
        rep.thumbnail,
        rep.permalink,
        rep.brand,
        rep.category_id,
        rep.category_name,
        rep.listing_type_id
      FROM (${aggregateSql}) agg
      INNER JOIN (${REPRESENTATIVE_PUBLICATION_SQL}) rep ON rep.sku = agg.sku
      ${outer.sql}
      ORDER BY ${orderBySql}, agg.sku ASC
      LIMIT ? OFFSET ?
      `,
      [...aggregateParams, ...outer.params, params.limit, params.offset],
    );
    const products = productsResult as SkuAggregateRow[];

    const countResult: unknown = await this.entityManager.query(
      `
      SELECT COUNT(*) AS total
      FROM (${aggregateSql}) agg
      ${outer.sql}
      `,
      [...aggregateParams, ...outer.params],
    );
    const countRows = countResult as { total: string | number }[];
    const appliedFilters: MarketplaceSkuStatusAppliedFilters = {
      sku: params.sku,
      search: params.search,
      listingTypes: params.listingTypes,
      statuses: params.statuses,
      active: params.active,
      brands: params.brands,
      categories: params.categories,
      stock: params.stock,
      publishedIn: params.publishedIn,
      notPublishedIn: params.notPublishedIn,
      publishedMatch: params.publishedMatch,
      published: params.published,
      sortBy: params.sortBy,
      sortDir: params.sortDir,
    };
    const pagination = {
      limit: params.limit,
      offset: params.offset,
      total: Number(countRows[0]?.total ?? 0),
    };

    if (!products.length) {
      return { items: [], marketplaces, filters: appliedFilters, pagination };
    }

    const productSkus = products.map((product) => product.sku);
    const skuPlaceholders = productSkus.map(() => '?').join(', ');
    const marketplacePlaceholders = marketplaces.map(() => '?').join(', ');
    const publicationsResult: unknown = await this.entityManager.query(
      `
      SELECT sku, marketplace, publication_status
      FROM marketplace_product_publications
      WHERE sku IN (${skuPlaceholders})
        AND marketplace IN (${marketplacePlaceholders})
      `,
      [...productSkus, ...marketplaces],
    );
    const publications = publicationsResult as {
      sku: string;
      marketplace: string;
      publication_status: string;
    }[];
    const statusBySkuMarketplace = new Map<string, boolean>();

    for (const publication of publications) {
      statusBySkuMarketplace.set(
        `${publication.sku}|${publication.marketplace}`,
        publication.publication_status === 'published',
      );
    }

    return {
      items: products.map((product) => {
        const stock = this.toNumberOrNull(product.stock);
        const activePublications = Number(product.active_publications ?? 0);
        const row: MarketplacePublicationSkuStatusRow = {
          sku: product.sku,
          meli_item_id: product.meli_item_id,
          title: product.title,
          status: product.status,
          price: this.toNumberOrNull(product.price),
          price_min: this.toNumberOrNull(product.price_min),
          price_max: this.toNumberOrNull(product.price_max),
          available_quantity: stock,
          stock,
          thumbnail: product.thumbnail,
          permalink: product.permalink,
          brand: product.brand,
          category_id: product.category_id,
          category_name: product.category_name,
          listing_type_id: product.listing_type_id,
          listing_type: toListingTypeLabel(product.listing_type_id),
          publications: Number(product.publications ?? 0),
          active_publications: activePublications,
          classic_publications: Number(product.classic_publications ?? 0),
          premium_publications: Number(product.premium_publications ?? 0),
          in_stock: (stock ?? 0) > 0,
          is_active: activePublications > 0,
          updated_at: product.updated_at,
        };

        for (const marketplace of marketplaces) {
          row[marketplace] =
            statusBySkuMarketplace.get(`${product.sku}|${marketplace}`) ??
            false;
        }

        return row;
      }),
      marketplaces,
      filters: appliedFilters,
      pagination,
    };
  }

  async getSkuPublicationFacets(): Promise<MarketplaceSkuStatusFacetsResult> {
    const marketplaces = await this.getKnownMarketplaces();
    const from = `
      FROM mercadolibre_products
      WHERE sku IS NOT NULL AND sku <> ''
    `;

    const brandsResult: unknown = await this.entityManager.query(`
      SELECT brand AS value, COUNT(DISTINCT sku) AS total
      ${from} AND brand IS NOT NULL AND brand <> ''
      GROUP BY brand
      ORDER BY total DESC, brand ASC
    `);
    const categoriesResult: unknown = await this.entityManager.query(`
      SELECT category_id AS value, MAX(category_name) AS label, COUNT(DISTINCT sku) AS total
      ${from} AND category_id IS NOT NULL AND category_id <> ''
      GROUP BY category_id
      ORDER BY total DESC, label ASC
    `);
    const listingTypesResult: unknown = await this.entityManager.query(`
      SELECT listing_type_id AS value, COUNT(DISTINCT sku) AS total
      ${from} AND listing_type_id IS NOT NULL AND listing_type_id <> ''
      GROUP BY listing_type_id
      ORDER BY total DESC
    `);
    const statusesResult: unknown = await this.entityManager.query(`
      SELECT status AS value, COUNT(DISTINCT sku) AS total
      ${from} AND status IS NOT NULL AND status <> ''
      GROUP BY status
      ORDER BY total DESC
    `);
    const summaryResult: unknown = await this.entityManager.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN agg.stock > 0 THEN 1 ELSE 0 END) AS in_stock,
        SUM(CASE WHEN agg.stock IS NULL OR agg.stock <= 0 THEN 1 ELSE 0 END) AS out_of_stock,
        MIN(agg.price_min) AS min_price,
        MAX(agg.price_max) AS max_price
      FROM (
        SELECT
          MAX(available_quantity) AS stock,
          MIN(price) AS price_min,
          MAX(price) AS price_max
        ${from}
        GROUP BY sku
      ) agg
    `);

    const brands = brandsResult as { value: string; total: number }[];
    const categories = categoriesResult as {
      value: string;
      label: string | null;
      total: number;
    }[];
    const listingTypes = listingTypesResult as {
      value: string;
      total: number;
    }[];
    const statuses = statusesResult as { value: string; total: number }[];
    const summary = (
      summaryResult as {
        total: string | number;
        in_stock: string | number | null;
        out_of_stock: string | number | null;
        min_price: string | number | null;
        max_price: string | number | null;
      }[]
    )[0];

    return {
      marketplaces,
      brands: brands.map((brand) => ({
        value: brand.value,
        label: brand.value,
        total: Number(brand.total),
      })),
      categories: categories.map((category) => ({
        value: category.value,
        label: category.label ?? category.value,
        total: Number(category.total),
      })),
      listingTypes: listingTypes.map((listingType) => ({
        value: toListingTypeLabel(listingType.value) ?? listingType.value,
        label: LISTING_TYPE_LABELS[listingType.value] ?? listingType.value,
        total: Number(listingType.total),
      })),
      statuses: statuses.map((status) => ({
        value: status.value,
        label: STATUS_LABELS[status.value] ?? status.value,
        total: Number(status.total),
      })),
      stock: [
        {
          value: 'in_stock',
          label: 'Con stock',
          total: Number(summary?.in_stock ?? 0),
        },
        {
          value: 'out_of_stock',
          label: 'Sin stock',
          total: Number(summary?.out_of_stock ?? 0),
        },
      ],
      price: {
        min: this.toNumberOrNull(summary?.min_price ?? null),
        max: this.toNumberOrNull(summary?.max_price ?? null),
      },
      total: Number(summary?.total ?? 0),
    };
  }

  private buildSkuStatusInnerFilters(params: MarketplaceSkuStatusFilters): {
    sql: string;
    params: unknown[];
  } {
    if (!params.sku) {
      return { sql: '', params: [] };
    }

    return { sql: 'AND sku = ?', params: [params.sku] };
  }

  private buildSkuStatusHaving(params: MarketplaceSkuStatusFilters): {
    sql: string;
    params: unknown[];
  } {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (params.search) {
      conditions.push(
        'SUM(sku LIKE ? OR title LIKE ? OR meli_item_id LIKE ?) > 0',
      );
      const like = `%${params.search}%`;
      values.push(like, like, like);
    }

    if (params.listingTypes.length) {
      conditions.push(
        `SUM(listing_type_id IN (${params.listingTypes.map(() => '?').join(', ')})) > 0`,
      );
      values.push(...params.listingTypes);
    }

    if (params.statuses.length) {
      conditions.push(
        `SUM(status IN (${params.statuses.map(() => '?').join(', ')})) > 0`,
      );
      values.push(...params.statuses);
    }

    if (params.active === true) {
      conditions.push('active_publications > 0');
    }

    if (params.active === false) {
      conditions.push('active_publications = 0');
    }

    if (params.brands.length) {
      conditions.push(
        `SUM(brand IN (${params.brands.map(() => '?').join(', ')})) > 0`,
      );
      values.push(...params.brands);
    }

    if (params.categories.length) {
      const placeholders = params.categories.map(() => '?').join(', ');
      conditions.push(
        `SUM(category_id IN (${placeholders}) OR category_name IN (${placeholders})) > 0`,
      );
      values.push(...params.categories, ...params.categories);
    }

    if (params.stock === 'in_stock') {
      conditions.push('stock > 0');
    }

    if (params.stock === 'out_of_stock') {
      conditions.push('(stock IS NULL OR stock <= 0)');
    }

    return {
      sql: conditions.length
        ? `HAVING ${conditions.join('\n        AND ')}`
        : '',
      params: values,
    };
  }

  private buildSkuStatusMarketplaceFilters(
    params: MarketplaceSkuStatusFilters,
    marketplaces: string[],
  ): { sql: string; params: unknown[] } {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const publishedIn = params.publishedIn.length
      ? params.publishedIn
      : params.published === true
        ? marketplaces
        : [];
    const notPublishedIn = params.notPublishedIn.length
      ? params.notPublishedIn
      : params.published === false
        ? marketplaces
        : [];

    if (publishedIn.length) {
      if (params.publishedMatch === 'all') {
        for (const marketplace of publishedIn) {
          conditions.push(`EXISTS (${PUBLISHED_EXISTS_SQL('?')})`);
          values.push(marketplace);
        }
      } else {
        const placeholders = publishedIn.map(() => '?').join(', ');
        conditions.push(`EXISTS (${PUBLISHED_EXISTS_SQL(placeholders)})`);
        values.push(...publishedIn);
      }
    }

    if (notPublishedIn.length) {
      const placeholders = notPublishedIn.map(() => '?').join(', ');
      conditions.push(`NOT EXISTS (${PUBLISHED_EXISTS_SQL(placeholders)})`);
      values.push(...notPublishedIn);
    }

    return {
      sql: conditions.length
        ? `WHERE ${conditions.join('\n        AND ')}`
        : '',
      params: values,
    };
  }

  private toNumberOrNull(value: string | number | null): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
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

  private async getKnownMarketplaces(): Promise<string[]> {
    const queryResult: unknown = await this.entityManager.query(`
      SELECT DISTINCT marketplace
      FROM marketplace_product_publications
      WHERE marketplace IS NOT NULL AND marketplace <> ''
      ORDER BY marketplace ASC
    `);
    const rows = queryResult as { marketplace: string }[];
    const marketplaces = new Set(DEFAULT_MARKETPLACES);

    for (const row of rows) {
      marketplaces.add(row.marketplace);
    }

    return Array.from(marketplaces);
  }
}
