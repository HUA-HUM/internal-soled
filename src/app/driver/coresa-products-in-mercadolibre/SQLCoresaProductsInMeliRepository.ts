import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import type { ISQLCoresaProductsInMeliRepository } from 'src/core/adapters/coresa-products-in-mercadolibre/ISQLCoresaProductsInMeliRepository';
import {
  CoresaProductInMeliDTO,
  CoresaProductInMeliFilters,
  CoresaProductInMeliListResult,
  CoresaProductInMeliRow,
  UpdateCoresaProductInMeliInput,
  UpsertCoresaProductInMeliInput,
} from 'src/core/entitis/coresa-products-in-mercadolibre/CoresaProductInMeliTypes';
import { EntityManager } from 'typeorm';

const UPSERT_CHUNK_SIZE = 500;

/**
 * La tabla tiene PRIMARY KEY (SKU) y UNIQUE (MLA), y las columnas usan
 * mayusculas, asi que van siempre entre backticks.
 *
 * Con esas dos claves, un upsert que choca por SKU reasigna la MLA de ese SKU,
 * y uno que choca por MLA reasigna sus flags. Es lo que se espera al volver a
 * registrar un producto.
 */
const UPSERT_SQL = `
  INSERT INTO coresa_products_in_mercadolibre (\`SKU\`, \`MLA\`, \`updateStock\`, \`updatePrice\`)
  VALUES %VALUES%
  ON DUPLICATE KEY UPDATE
    \`MLA\` = VALUES(\`MLA\`),
    \`updateStock\` = VALUES(\`updateStock\`),
    \`updatePrice\` = VALUES(\`updatePrice\`)
`;

@Injectable()
export class SQLCoresaProductsInMeliRepository implements ISQLCoresaProductsInMeliRepository {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async upsert(
    input: UpsertCoresaProductInMeliInput,
  ): Promise<CoresaProductInMeliDTO> {
    await this.entityManager.query(
      UPSERT_SQL.replace('%VALUES%', '(?, ?, ?, ?)'),
      [
        input.sku,
        input.mla,
        this.toFlag(input.updateStock),
        this.toFlag(input.updatePrice),
      ],
    );

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

    let upserted = 0;

    await this.entityManager.transaction(async (manager) => {
      for (let start = 0; start < inputs.length; start += UPSERT_CHUNK_SIZE) {
        const chunk = inputs.slice(start, start + UPSERT_CHUNK_SIZE);
        const values: unknown[] = [];

        for (const input of chunk) {
          values.push(
            input.sku,
            input.mla,
            this.toFlag(input.updateStock),
            this.toFlag(input.updatePrice),
          );
        }

        await manager.query(
          UPSERT_SQL.replace(
            '%VALUES%',
            chunk.map(() => '(?, ?, ?, ?)').join(', '),
          ),
          values,
        );

        upserted += chunk.length;
      }
    });

    return upserted;
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

  private toFlag(value: boolean | undefined): number {
    return value === false ? 0 : 1;
  }

  private toDTO(row: CoresaProductInMeliRow): CoresaProductInMeliDTO {
    return {
      sku: row.SKU,
      mla: row.MLA,
      updateStock: Number(row.updateStock) === 1,
      updatePrice: Number(row.updatePrice) === 1,
      createdAt: this.toIsoStringOrNull(row.createdAt),
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
