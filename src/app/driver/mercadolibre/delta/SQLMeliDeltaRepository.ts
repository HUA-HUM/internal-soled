import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import type { ISQLMeliProductDeltasRepository } from 'src/core/adapters/mercadolibre/products/ISQLMeliProductDeltasRepository';
import {
  MeliProductDeltaCursorRow,
  MeliProductDeltaRow,
  ProductDeltaCursorResult,
  ProductDeltaFilters,
} from 'src/core/entitis/mercadolibre/products/MeliProductDeltaRow';
import {
  PaginatedResult,
  PaginationOptions,
} from 'src/core/entitis/mercadolibre/products/dto/MeliProductDTO';
import { EntityManager } from 'typeorm';

@Injectable()
export class SQLMeliDeltaRepository implements ISQLMeliProductDeltasRepository {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async getProductDeltas(
    pagination: PaginationOptions,
    filters: ProductDeltaFilters,
  ): Promise<PaginatedResult<MeliProductDeltaRow>> {
    const offset = (pagination.page - 1) * pagination.limit;
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (filters.procesado !== undefined) {
      whereClauses.push('procesado = ?');
      params.push(filters.procesado ? 1 : 0);
    }

    const whereSql = whereClauses.length
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT *
      FROM mercadolibre_products_delta
      ${whereSql}
      ORDER BY id ASC
      LIMIT ? OFFSET ?
      `,
      [...params, pagination.limit, offset],
    );
    const rows = queryResult as MeliProductDeltaRow[];
    const total = await this.countProductDeltas(whereSql, params);

    return {
      data: rows,
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async getProductDeltasAfterId(
    lastDeltaId: number,
    limit: number,
  ): Promise<ProductDeltaCursorResult> {
    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT *
      FROM mercadolibre_products_delta
      WHERE id > ?
      ORDER BY id ASC
      LIMIT ?
      `,
      [lastDeltaId, limit],
    );
    const rows = queryResult as MeliProductDeltaRow[];
    const nextCursor = rows.length
      ? Math.max(...rows.map((row) => Number(row.id)))
      : lastDeltaId;

    return {
      data: rows,
      lastDeltaId,
      nextCursor,
      limit,
      hasMore: rows.length === limit,
    };
  }

  async getDeltaCursor(
    consumer: string,
  ): Promise<MeliProductDeltaCursorRow | null> {
    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT *
      FROM mercadolibre_products_delta_cursors
      WHERE consumer = ?
      LIMIT 1
      `,
      [consumer],
    );
    const rows = queryResult as MeliProductDeltaCursorRow[];

    return rows.length ? rows[0] : null;
  }

  async saveDeltaCursor(
    consumer: string,
    lastDeltaId: number,
  ): Promise<MeliProductDeltaCursorRow> {
    await this.entityManager.query(
      `
      INSERT INTO mercadolibre_products_delta_cursors (
        consumer,
        last_delta_id
      ) VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        last_delta_id = VALUES(last_delta_id),
        updated_at = NOW()
      `,
      [consumer, lastDeltaId],
    );

    const cursor = await this.getDeltaCursor(consumer);

    if (!cursor) {
      throw new Error('[SQLMeliDeltaRepository] Cursor was not saved');
    }

    return cursor;
  }

  private async countProductDeltas(
    whereSql: string,
    params: unknown[],
  ): Promise<number> {
    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT COUNT(*) AS total
      FROM mercadolibre_products_delta
      ${whereSql}
      `,
      params,
    );
    const rows = queryResult as { total: string | number }[];

    return Number(rows[0]?.total ?? 0);
  }
}
