import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import type { ISQLCoresaSyncChangesRepository } from 'src/core/adapters/coresa-sync-changes/ISQLCoresaSyncChangesRepository';
import {
  CoresaSyncChangeDTO,
  CoresaSyncChangeFilters,
  CoresaSyncChangeListResult,
  CoresaSyncChangeRow,
  CoresaSyncChangeStatsResult,
  CreateCoresaSyncChangeInput,
} from 'src/core/entitis/coresa-sync-changes/CoresaSyncChangeTypes';
import { EntityManager } from 'typeorm';

const INSERT_COLUMNS = [
  'run_id',
  'sku',
  'mla',
  'source',
  'result',
  'price_before',
  'price_requested',
  'price_applied',
  'stock_before',
  'stock_requested',
  'stock_applied',
  'meli_status',
  'meli_sub_status',
  'error_code',
  'error_message',
] as const;

const ROW_PLACEHOLDERS = `(${INSERT_COLUMNS.map(() => '?').join(', ')})`;

/** Filas por sentencia. 200 x 15 columnas deja 3000 placeholders, bien lejos del limite. */
const INSERT_CHUNK_SIZE = 200;

/** Ventana por defecto de /stats, en dias, cuando no se informan from/to. */
const DEFAULT_STATS_WINDOW_DAYS = 7;

@Injectable()
export class SQLCoresaSyncChangesRepository implements ISQLCoresaSyncChangesRepository {
  private readonly logger = new Logger(SQLCoresaSyncChangesRepository.name);

  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  /**
   * Todo el lote va en una sola transaccion: si una fila falla, no entra
   * ninguna. El camino feliz manda INSERT de varias filas; si un chunk falla,
   * se reintenta fila por fila solo para poder decir que indice fue, porque
   * MySQL no lo informa en un INSERT multi-fila.
   */
  async bulkInsert(changes: CreateCoresaSyncChangeInput[]): Promise<number> {
    if (!changes.length) {
      return 0;
    }

    await this.entityManager.transaction(async (manager) => {
      for (let start = 0; start < changes.length; start += INSERT_CHUNK_SIZE) {
        const chunk = changes.slice(start, start + INSERT_CHUNK_SIZE);

        try {
          await manager.query(
            this.buildInsertSql(chunk.length),
            chunk.flatMap((change) => this.toValues(change)),
          );
        } catch {
          await this.insertOneByOne(manager, chunk, start);
        }
      }
    });

    return changes.length;
  }

  async list(params: {
    filters: CoresaSyncChangeFilters;
    limit: number;
    offset: number;
  }): Promise<CoresaSyncChangeListResult> {
    const { whereSql, queryParams } = this.buildWhere(params.filters);
    const rows = await this.queryRows(
      `
      SELECT *
      FROM coresa_meli_sync_changes
      ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
      `,
      [...queryParams, params.limit, params.offset],
    );
    const countResult: unknown = await this.entityManager.query(
      `
      SELECT COUNT(*) AS total
      FROM coresa_meli_sync_changes
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

  async getStats(params: {
    from?: string;
    to?: string;
  }): Promise<CoresaSyncChangeStatsResult> {
    const to = params.to ?? (await this.getDatabaseDate());
    const from =
      params.from ?? this.shiftDate(to, -(DEFAULT_STATS_WINDOW_DAYS - 1));
    const whereSql =
      'WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)';
    const queryParams = [`${from} 00:00:00`, `${to} 00:00:00`];
    const updatedSql = "SUM(CASE WHEN result = 'updated' THEN 1 ELSE 0 END)";
    const notAppliedSql =
      "SUM(CASE WHEN result = 'not_applied' THEN 1 ELSE 0 END)";
    const failedSql = "SUM(CASE WHEN result = 'failed' THEN 1 ELSE 0 END)";

    const [summaryRows, dayRows] = await Promise.all([
      this.queryPlainRows(
        `
        SELECT
          COUNT(*) AS total,
          ${updatedSql} AS updated,
          ${notAppliedSql} AS not_applied,
          ${failedSql} AS failed
        FROM coresa_meli_sync_changes
        ${whereSql}
        `,
        queryParams,
      ),
      this.queryPlainRows(
        `
        SELECT
          DATE_FORMAT(created_at, '%Y-%m-%d') AS date,
          ${updatedSql} AS updated,
          ${notAppliedSql} AS not_applied,
          ${failedSql} AS failed
        FROM coresa_meli_sync_changes
        ${whereSql}
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
        ORDER BY date ASC
        `,
        queryParams,
      ),
    ]);
    const summary = summaryRows[0] ?? {};

    return {
      from,
      to,
      total: this.toNumber(summary.total),
      updated: this.toNumber(summary.updated),
      notApplied: this.toNumber(summary.not_applied),
      failed: this.toNumber(summary.failed),
      byDay: dayRows.map((row) => ({
        date: String(row.date),
        updated: this.toNumber(row.updated),
        notApplied: this.toNumber(row.not_applied),
        failed: this.toNumber(row.failed),
      })),
    };
  }

  private buildInsertSql(rowCount: number): string {
    return `
      INSERT INTO coresa_meli_sync_changes (${INSERT_COLUMNS.join(', ')})
      VALUES ${Array.from({ length: rowCount }, () => ROW_PLACEHOLDERS).join(', ')}
    `;
  }

  private async insertOneByOne(
    manager: EntityManager,
    chunk: CreateCoresaSyncChangeInput[],
    offset: number,
  ): Promise<void> {
    for (const [index, change] of chunk.entries()) {
      try {
        await manager.query(this.buildInsertSql(1), this.toValues(change));
      } catch (error) {
        const absoluteIndex = offset + index;
        const message =
          error instanceof Error ? error.message : 'unknown database error';

        this.logger.error(
          `[CORESA-SYNC-CHANGES] Bulk insert item failed | index=${absoluteIndex} sku=${change.sku} mla=${change.mla} message=${message}`,
        );

        throw new InternalServerErrorException(
          `[SQLCoresaSyncChangesRepository] Bulk insert failed at changes[${absoluteIndex}] sku=${change.sku} mla=${change.mla} | ${message}`,
        );
      }
    }
  }

  private toValues(change: CreateCoresaSyncChangeInput): unknown[] {
    return [
      change.runId ?? null,
      change.sku,
      change.mla,
      change.source,
      change.result,
      this.toIntOrNull(change.priceBefore),
      this.toIntOrNull(change.priceRequested),
      this.toIntOrNull(change.priceApplied),
      this.toIntOrNull(change.stockBefore),
      this.toIntOrNull(change.stockRequested),
      this.toIntOrNull(change.stockApplied),
      change.meliStatus ?? null,
      this.stringifyJsonOrNull(change.meliSubStatus),
      change.errorCode ?? null,
      change.errorMessage ?? null,
    ];
  }

  private buildWhere(filters: CoresaSyncChangeFilters): {
    whereSql: string;
    queryParams: unknown[];
  } {
    const clauses: string[] = [];
    const queryParams: unknown[] = [];

    if (filters.sku) {
      clauses.push('sku = ?');
      queryParams.push(filters.sku);
    }

    if (filters.mla) {
      clauses.push('mla = ?');
      queryParams.push(filters.mla);
    }

    if (filters.result) {
      clauses.push('result = ?');
      queryParams.push(filters.result);
    }

    if (filters.runId !== undefined) {
      clauses.push('run_id = ?');
      queryParams.push(filters.runId);
    }

    if (filters.from) {
      clauses.push('created_at >= ?');
      queryParams.push(`${filters.from} 00:00:00`);
    }

    if (filters.to) {
      clauses.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)');
      queryParams.push(`${filters.to} 00:00:00`);
    }

    return {
      whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
      queryParams,
    };
  }

  private async queryRows(
    sql: string,
    params: unknown[],
  ): Promise<CoresaSyncChangeRow[]> {
    const result: unknown = await this.entityManager.query(sql, params);

    return result as CoresaSyncChangeRow[];
  }

  private async queryPlainRows(
    sql: string,
    params: unknown[],
  ): Promise<Record<string, unknown>[]> {
    const result: unknown = await this.entityManager.query(sql, params);

    return result as Record<string, unknown>[];
  }

  private toDTO(row: CoresaSyncChangeRow): CoresaSyncChangeDTO {
    return {
      id: Number(row.id),
      runId: row.run_id === null ? null : Number(row.run_id),
      sku: row.sku,
      mla: row.mla,
      source: row.source,
      result: row.result,
      priceBefore: this.toNumberOrNull(row.price_before),
      priceRequested: this.toNumberOrNull(row.price_requested),
      priceApplied: this.toNumberOrNull(row.price_applied),
      stockBefore: this.toNumberOrNull(row.stock_before),
      stockRequested: this.toNumberOrNull(row.stock_requested),
      stockApplied: this.toNumberOrNull(row.stock_applied),
      meliStatus: row.meli_status,
      meliSubStatus: this.parseJsonValue(row.meli_sub_status),
      errorCode: row.error_code,
      errorMessage: row.error_message,
      createdAt: this.toIsoStringOrNull(row.created_at),
    };
  }

  private async getDatabaseDate(): Promise<string> {
    const rows = await this.queryPlainRows(
      "SELECT DATE_FORMAT(CURRENT_DATE(), '%Y-%m-%d') AS date",
      [],
    );

    return String(rows[0].date);
  }

  private shiftDate(date: string, days: number): string {
    const shifted = new Date(`${date}T00:00:00Z`);

    shifted.setUTCDate(shifted.getUTCDate() + days);

    return shifted.toISOString().slice(0, 10);
  }

  private toIntOrNull(value: number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    return Number.isFinite(value) ? Math.trunc(value) : null;
  }

  private toNumberOrNull(value: number | string | null): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  private stringifyJsonOrNull(value: unknown): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    return JSON.stringify(value);
  }

  private parseJsonValue(value: unknown): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
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
