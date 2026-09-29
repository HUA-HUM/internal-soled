import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import type { ISQLCoresaProductsInMeliRepository } from 'src/core/adapters/coresa-products-in-mercadolibre/ISQLCoresaProductsInMeliRepository';
import {
  CoresaProductInMeliDTO,
  CoresaProductInMeliFilters,
  CoresaProductInMeliListResult,
  CoresaProductInMeliRow,
  CoresaProductInMeliVariantInput,
  UpdateCoresaProductInMeliInput,
  UpsertCoresaProductInMeliInput,
} from 'src/core/entitis/coresa-products-in-mercadolibre/CoresaProductInMeliTypes';
import { EntityManager } from 'typeorm';

const UPSERT_CHUNK_SIZE = 500;

/**
 * Clave del input -> columna. El orden fija el orden del INSERT.
 *
 * SKU y MLA van aparte porque siempre se escriben; estas son las opcionales, y
 * una clave ausente se excluye del INSERT: asi la fila nueva toma el DEFAULT de
 * la columna y la fila existente conserva su valor.
 */
const VARIANT_COLUMNS: Record<keyof CoresaProductInMeliVariantInput, string> = {
  updateStock: 'updateStock',
  updatePrice: 'updatePrice',
  listingType: 'listing_type',
  unitsPerListing: 'units_per_listing',
  modalidad: 'modalidad',
  priceFactor: 'price_factor',
  origen: 'origen',
};

const VARIANT_KEYS = Object.keys(
  VARIANT_COLUMNS,
) as (keyof CoresaProductInMeliVariantInput)[];

const quote = (column: string): string => `\`${column}\``;

@Injectable()
export class SQLCoresaProductsInMeliRepository implements ISQLCoresaProductsInMeliRepository {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async upsert(
    input: UpsertCoresaProductInMeliInput,
  ): Promise<CoresaProductInMeliDTO> {
    await this.runUpsert(this.entityManager, [input]);

    const publication = await this.getByMla(input.mla);

    if (!publication) {
      throw new Error(
        `[SQLCoresaProductsInMeliRepository] Row was not saved: ${input.sku}/${input.mla}`,
      );
    }

    return publication;
  }

  async bulkUpsert(inputs: UpsertCoresaProductInMeliInput[]): Promise<number> {
    if (!inputs.length) {
      return 0;
    }

    await this.entityManager.transaction(async (manager) => {
      for (let start = 0; start < inputs.length; start += UPSERT_CHUNK_SIZE) {
        await this.runUpsert(
          manager,
          inputs.slice(start, start + UPSERT_CHUNK_SIZE),
        );
      }
    });

    return inputs.length;
  }

  /**
   * Agrupa las filas por el conjunto de campos que traen y manda un INSERT por
   * grupo. Es la forma de respetar "lo que no viene no se pisa" en un INSERT
   * multi-fila, donde ON DUPLICATE KEY UPDATE no puede decidir columna por
   * columna segun la fila. En la practica coresa-api manda siempre la misma
   * forma, asi que suele ser un solo grupo.
   */
  private async runUpsert(
    manager: EntityManager,
    inputs: UpsertCoresaProductInMeliInput[],
  ): Promise<void> {
    const groups = new Map<string, UpsertCoresaProductInMeliInput[]>();

    for (const input of inputs) {
      const present = VARIANT_KEYS.filter(
        (key) => input[key] !== undefined,
      ).join(',');
      const group = groups.get(present);

      if (group) {
        group.push(input);
      } else {
        groups.set(present, [input]);
      }
    }

    for (const [present, group] of groups) {
      const keys = present
        ? (present.split(',') as (keyof CoresaProductInMeliVariantInput)[])
        : [];
      const columns = [
        'SKU',
        'MLA',
        ...keys.map((key) => VARIANT_COLUMNS[key]),
      ];
      const placeholders = `(${columns.map(() => '?').join(', ')})`;
      // El upsert es por MLA: si esa MLA ya estaba, se actualiza su fila, y el
      // SKU tambien, por si se reasigno.
      const assignments = [
        '`SKU` = VALUES(`SKU`)',
        ...keys.map((key) => {
          const column = quote(VARIANT_COLUMNS[key]);

          return `${column} = VALUES(${column})`;
        }),
      ].join(', ');
      const values: unknown[] = [];

      for (const input of group) {
        values.push(input.sku, input.mla);

        for (const key of keys) {
          values.push(this.toColumnValue(key, input[key]));
        }
      }

      await manager.query(
        `
        INSERT INTO coresa_products_in_mercadolibre (${columns.map(quote).join(', ')})
        VALUES ${group.map(() => placeholders).join(', ')}
        ON DUPLICATE KEY UPDATE ${assignments}
        `,
        values,
      );
    }
  }

  async getBySku(sku: string): Promise<CoresaProductInMeliDTO[]> {
    const rows = await this.queryRows(
      `
      SELECT *
      FROM coresa_products_in_mercadolibre
      WHERE \`SKU\` = ?
      ORDER BY \`MLA\` ASC
      `,
      [sku],
    );

    return rows.map((row) => this.toDTO(row));
  }

  async getBySkus(skus: string[]): Promise<CoresaProductInMeliDTO[]> {
    if (!skus.length) {
      return [];
    }

    const rows = await this.queryRows(
      `
      SELECT *
      FROM coresa_products_in_mercadolibre
      WHERE \`SKU\` IN (${skus.map(() => '?').join(', ')})
      ORDER BY \`SKU\` ASC, \`MLA\` ASC
      `,
      skus,
    );

    return rows.map((row) => this.toDTO(row));
  }

  async getByMla(mla: string): Promise<CoresaProductInMeliDTO | null> {
    const rows = await this.queryRows(
      `
      SELECT *
      FROM coresa_products_in_mercadolibre
      WHERE \`MLA\` = ?
      LIMIT 1
      `,
      [mla],
    );

    return rows.length ? this.toDTO(rows[0]) : null;
  }

  async updateBySku(
    sku: string,
    input: UpdateCoresaProductInMeliInput,
  ): Promise<CoresaProductInMeliDTO[]> {
    const { assignments, queryParams } = this.buildAssignments(input);

    if (assignments.length) {
      await this.entityManager.query(
        `
        UPDATE coresa_products_in_mercadolibre
        SET ${assignments.join(', ')}
        WHERE \`SKU\` = ?
        `,
        [...queryParams, sku],
      );
    }

    return this.getBySku(sku);
  }

  async updateByMla(
    mla: string,
    input: UpdateCoresaProductInMeliInput,
  ): Promise<CoresaProductInMeliDTO | null> {
    const { assignments, queryParams } = this.buildAssignments(input);

    if (assignments.length) {
      await this.entityManager.query(
        `
        UPDATE coresa_products_in_mercadolibre
        SET ${assignments.join(', ')}
        WHERE \`MLA\` = ?
        `,
        [...queryParams, mla],
      );
    }

    return this.getByMla(mla);
  }

  async list(params: {
    filters: CoresaProductInMeliFilters;
    limit: number;
    offset: number;
  }): Promise<CoresaProductInMeliListResult> {
    const { whereSql, queryParams } = this.buildWhere(params.filters);
    const rows = await this.queryRows(
      `
      SELECT *
      FROM coresa_products_in_mercadolibre
      ${whereSql}
      ORDER BY \`SKU\` ASC, \`MLA\` ASC
      LIMIT ? OFFSET ?
      `,
      [...queryParams, params.limit, params.offset],
    );
    const countResult: unknown = await this.entityManager.query(
      `
      SELECT COUNT(*) AS total
      FROM coresa_products_in_mercadolibre
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

  private toColumnValue(
    key: keyof CoresaProductInMeliVariantInput,
    value: unknown,
  ): unknown {
    if (key === 'updateStock' || key === 'updatePrice') {
      return value ? 1 : 0;
    }

    return value ?? null;
  }

  private buildAssignments(input: UpdateCoresaProductInMeliInput): {
    assignments: string[];
    queryParams: unknown[];
  } {
    const assignments: string[] = [];
    const queryParams: unknown[] = [];

    if (input.updateStock !== undefined) {
      assignments.push('`updateStock` = ?');
      queryParams.push(input.updateStock ? 1 : 0);
    }

    if (input.updatePrice !== undefined) {
      assignments.push('`updatePrice` = ?');
      queryParams.push(input.updatePrice ? 1 : 0);
    }

    return { assignments, queryParams };
  }

  private buildWhere(filters: CoresaProductInMeliFilters): {
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

    if (filters.mla) {
      clauses.push('`MLA` = ?');
      queryParams.push(filters.mla);
    }

    if (filters.updateStock !== undefined) {
      clauses.push('`updateStock` = ?');
      queryParams.push(filters.updateStock ? 1 : 0);
    }

    if (filters.updatePrice !== undefined) {
      clauses.push('`updatePrice` = ?');
      queryParams.push(filters.updatePrice ? 1 : 0);
    }

    return {
      whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
      queryParams,
    };
  }

  private async queryRows(
    sql: string,
    params: unknown[],
  ): Promise<CoresaProductInMeliRow[]> {
    const result: unknown = await this.entityManager.query(sql, params);

    return result as CoresaProductInMeliRow[];
  }

  /**
   * listing_type, units_per_listing y modalidad vuelven en null en las filas
   * heredadas. Ese null es informacion, no se completa con defaults.
   */
  private toDTO(row: CoresaProductInMeliRow): CoresaProductInMeliDTO {
    return {
      sku: row.SKU,
      mla: row.MLA,
      updateStock: Number(row.updateStock) === 1,
      updatePrice: Number(row.updatePrice) === 1,
      listing_type: row.listing_type,
      units_per_listing:
        row.units_per_listing === null ? null : Number(row.units_per_listing),
      modalidad: row.modalidad,
      price_factor: Number(row.price_factor ?? 1),
      origen: row.origen,
      createdAt: this.toIsoStringOrNull(row.createdAt),
      updatedAt: this.toIsoStringOrNull(row.updated_at),
    };
  }

  private toIsoStringOrNull(value: Date | string | null): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toISOString();
  }
}
