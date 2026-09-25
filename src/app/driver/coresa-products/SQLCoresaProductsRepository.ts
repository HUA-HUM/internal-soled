import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import type { ISQLCoresaProductsRepository } from 'src/core/adapters/coresa-products/ISQLCoresaProductsRepository';
import {
  CORESA_PRODUCT_FIELDS,
  CORESA_PRODUCT_UPDATABLE_FIELDS,
  CoresaFieldType,
  CoresaProductDTO,
  CoresaProductFilters,
  CoresaProductInput,
  CoresaProductListResult,
} from 'src/core/entitis/coresa-products/CoresaProductTypes';
import { EntityManager } from 'typeorm';

/**
 * Filas por sentencia en el upsert masivo. Con 68 columnas por fila esto deja
 * unos 6800 placeholders por statement, muy por debajo del limite de MySQL, y
 * evita mandar miles de INSERT de una fila cada uno.
 */
const UPSERT_CHUNK_SIZE = 100;

/**
 * Las columnas llevan backtick siempre: los nombres del feed tienen mayusculas
 * y el server corre con ANSI_QUOTES, donde las comillas dobles no sirven para
 * citar identificadores de forma portable.
 */
const quote = (field: string): string => `\`${field}\``;

const INSERT_COLUMNS_SQL = CORESA_PRODUCT_FIELDS.map((field) =>
  quote(field.field),
).join(', ');

const ROW_PLACEHOLDERS = `(${CORESA_PRODUCT_FIELDS.map(() => '?').join(', ')})`;

const UPDATE_ASSIGNMENTS_SQL = CORESA_PRODUCT_UPDATABLE_FIELDS.map((field) => {
  const column = quote(field.field);

  return field.preserveOnUpsert
    ? `${column} = COALESCE(VALUES(${column}), ${column})`
    : `${column} = VALUES(${column})`;
}).join(', ');

@Injectable()
export class SQLCoresaProductsRepository implements ISQLCoresaProductsRepository {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async bulkUpsert(products: CoresaProductInput[]): Promise<number> {
    if (!products.length) {
      return 0;
    }

    let upserted = 0;

    await this.entityManager.transaction(async (manager) => {
      for (let start = 0; start < products.length; start += UPSERT_CHUNK_SIZE) {
        const chunk = products.slice(start, start + UPSERT_CHUNK_SIZE);
        const values: unknown[] = [];

        for (const product of chunk) {
          for (const field of CORESA_PRODUCT_FIELDS) {
            values.push(
              this.normalize(
                field.type,
                product[field.field],
                field.notNullFallback,
              ),
            );
          }
        }

        await manager.query(
          `
          INSERT INTO coresa_products (${INSERT_COLUMNS_SQL})
          VALUES ${chunk.map(() => ROW_PLACEHOLDERS).join(', ')}
          ON DUPLICATE KEY UPDATE ${UPDATE_ASSIGNMENTS_SQL}
          `,
          values,
        );

        upserted += chunk.length;
      }
    });

    return upserted;
  }

  async getBySku(sku: string): Promise<CoresaProductDTO | null> {
    const rows = await this.queryRows(
      `
      SELECT *
      FROM coresa_products
      WHERE \`SKU\` = ?
      LIMIT 1
      `,
      [sku],
    );

    return rows.length ? this.toDTO(rows[0]) : null;
  }

  async getBySkus(skus: string[]): Promise<CoresaProductDTO[]> {
    if (!skus.length) {
      return [];
    }

    const rows = await this.queryRows(
      `
      SELECT *
      FROM coresa_products
      WHERE \`SKU\` IN (${skus.map(() => '?').join(', ')})
      ORDER BY \`SKU\` ASC
      `,
      skus,
    );

    return rows.map((row) => this.toDTO(row));
  }

  async list(params: {
    filters: CoresaProductFilters;
    limit: number;
    offset: number;
  }): Promise<CoresaProductListResult> {
    const { whereSql, queryParams } = this.buildWhere(params.filters);
    const rows = await this.queryRows(
      `
      SELECT *
      FROM coresa_products
      ${whereSql}
      ORDER BY \`SKU\` ASC
      LIMIT ? OFFSET ?
      `,
      [...queryParams, params.limit, params.offset],
    );
    const countResult: unknown = await this.entityManager.query(
      `
      SELECT COUNT(*) AS total
      FROM coresa_products
      ${whereSql}
      `,
      queryParams,
    );
    const countRows = countResult as { total: string | number }[];

    return {
      items: rows.map((row) => this.toDTO(row)),
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: Number(countRows[0]?.total ?? 0),
      },
    };
  }

  private buildWhere(filters: CoresaProductFilters): {
    whereSql: string;
    queryParams: unknown[];
  } {
    const clauses: string[] = [];
    const queryParams: unknown[] = [];

    if (filters.sku) {
      clauses.push('`SKU` = ?');
      queryParams.push(filters.sku);
    }

    if (filters.skus?.length) {
      clauses.push(`\`SKU\` IN (${filters.skus.map(() => '?').join(', ')})`);
      queryParams.push(...filters.skus);
    }

    if (filters.marca) {
      clauses.push('`Marca` = ?');
      queryParams.push(filters.marca);
    }

    if (filters.macroFamilia) {
      clauses.push('`Macro_Familia` = ?');
      queryParams.push(filters.macroFamilia);
    }

    if (filters.subFamilia) {
      clauses.push('`Sub_Familia` = ?');
      queryParams.push(filters.subFamilia);
    }

    if (filters.search) {
      clauses.push('(`SKU` LIKE ? OR `Descripcion` LIKE ? OR `Marca` LIKE ?)');
      const like = `%${filters.search}%`;
      queryParams.push(like, like, like);
    }

    if (filters.disponible === true) {
      clauses.push('`Disponible` > 0');
    }

    if (filters.disponible === false) {
      clauses.push('`Disponible` <= 0');
    }

    return {
      whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
      queryParams,
    };
  }

  private async queryRows(
    sql: string,
    params: unknown[],
  ): Promise<Record<string, unknown>[]> {
    const result: unknown = await this.entityManager.query(sql, params);

    return result as Record<string, unknown>[];
  }

  /**
   * La columna y el campo se llaman igual, asi que esto solo convierte tipos:
   * MySQL devuelve DECIMAL como string y TINYINT(1) como 0/1.
   */
  private toDTO(row: Record<string, unknown>): CoresaProductDTO {
    const dto: Record<string, unknown> = {};

    for (const field of CORESA_PRODUCT_FIELDS) {
      dto[field.field] = this.denormalize(field.type, row[field.field]);
    }

    return { ...dto, SKU: String(row.SKU) };
  }

  private normalize(
    type: CoresaFieldType,
    value: unknown,
    notNullFallback?: number,
  ): unknown {
    const normalized = this.normalizeValue(type, value);

    if (normalized === null && notNullFallback !== undefined) {
      return notNullFallback;
    }

    return normalized;
  }

  /**
   * Coresa manda "" en lugar de null, incluso en numericos y booleanos, asi que
   * cualquier vacio se guarda como NULL.
   */
  private normalizeValue(type: CoresaFieldType, value: unknown): unknown {
    if (value === undefined || value === null) {
      return null;
    }

    // Solo los primitivos entran en una columna escalar. Un objeto o un array
    // se descartan en vez de terminar como "[object Object]".
    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean'
    ) {
      return null;
    }

    if (typeof value === 'string' && value.trim() === '') {
      return null;
    }

    if (type === 'string') {
      return typeof value === 'string' ? value.trim() : String(value);
    }

    if (type === 'bool') {
      if (typeof value === 'boolean') {
        return value ? 1 : 0;
      }

      const normalized = String(value).trim().toLowerCase();

      if (['true', '1', 'si', 'yes'].includes(normalized)) {
        return 1;
      }

      if (['false', '0', 'no'].includes(normalized)) {
        return 0;
      }

      return null;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return null;
    }

    return type === 'int' ? Math.trunc(parsed) : parsed;
  }

  private denormalize(type: CoresaFieldType, value: unknown): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    if (type === 'bool') {
      return Number(value) === 1;
    }

    if (type === 'int' || type === 'decimal') {
      const parsed = Number(value);

      return Number.isFinite(parsed) ? parsed : null;
    }

    return value;
  }
}
