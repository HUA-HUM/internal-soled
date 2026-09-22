import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import type { ISQLCoresaPublicationsRepository } from 'src/core/adapters/coresa-publications/ISQLCoresaPublicationsRepository';
import {
  CoresaPublicationDTO,
  CoresaPublicationFilters,
  CoresaPublicationListResult,
  CoresaPublicationRow,
  CreateCoresaPublicationInput,
  UpdateCoresaPublicationInput,
} from 'src/core/entitis/coresa-publications/CoresaPublicationTypes';
import { EntityManager } from 'typeorm';

/** Estados en los que el SKU todavia tiene un intento abierto. */
const OPEN_STATUSES = ['draft', 'ready', 'publishing'] as const;

const JSON_COLUMNS = new Set<string>([
  'coresa_snapshot',
  'draft_json',
  'validation_json',
  'response_json',
]);

const DATETIME_COLUMNS = new Set<string>(['ai_generated_at', 'published_at']);

/** Clave del input -> columna. El orden define el orden del SET del UPDATE. */
const UPDATE_COLUMNS: Record<keyof UpdateCoresaPublicationInput, string> = {
  status: 'status',
  draft: 'draft_json',
  coresaSnapshot: 'coresa_snapshot',
  categoryId: 'category_id',
  aiModel: 'ai_model',
  aiGeneratedAt: 'ai_generated_at',
  validation: 'validation_json',
  classicItemId: 'classic_item_id',
  premiumItemId: 'premium_item_id',
  permalink: 'permalink',
  response: 'response_json',
  errorCode: 'error_code',
  errorMessage: 'error_message',
  publishedAt: 'published_at',
};

@Injectable()
export class SQLCoresaPublicationsRepository implements ISQLCoresaPublicationsRepository {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async create(
    input: CreateCoresaPublicationInput,
  ): Promise<CoresaPublicationDTO> {
    const insertResult: unknown = await this.entityManager.query(
      `
      INSERT INTO coresa_meli_publications (
        sku,
        status,
        requested_by,
        coresa_snapshot,
        draft_json,
        ai_model,
        ai_generated_at,
        category_id
      )
      VALUES (?, 'draft', ?, ?, ?, ?, ?, ?)
      `,
      [
        input.sku,
        input.requestedBy ?? null,
        this.normalizeValue('coresa_snapshot', input.coresaSnapshot),
        this.normalizeValue('draft_json', input.draft),
        input.aiModel ?? null,
        this.normalizeValue('ai_generated_at', input.aiGeneratedAt),
        input.categoryId ?? null,
      ],
    );
    const id = this.getInsertId(insertResult);
    const publication = await this.getById(id);

    if (!publication) {
      throw new Error(
        `[SQLCoresaPublicationsRepository] Publication was not saved: ${input.sku}`,
      );
    }

    return publication;
  }

  async update(
    id: number,
    input: UpdateCoresaPublicationInput,
  ): Promise<CoresaPublicationDTO | null> {
    const assignments: string[] = [];
    const queryParams: unknown[] = [];

    for (const [key, column] of Object.entries(UPDATE_COLUMNS)) {
      const value = input[key as keyof UpdateCoresaPublicationInput];

      if (value === undefined) {
        continue;
      }

      assignments.push(`${column} = ?`);
      queryParams.push(this.normalizeValue(column, value));
    }

    if (assignments.length) {
      await this.entityManager.query(
        `
        UPDATE coresa_meli_publications
        SET ${assignments.join(', ')}
        WHERE id = ?
        `,
        [...queryParams, id],
      );
    }

    return this.getById(id);
  }

  async getById(id: number): Promise<CoresaPublicationDTO | null> {
    const rows = await this.queryRows(
      `
      SELECT *
      FROM coresa_meli_publications
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );

    return rows.length ? this.toDTO(rows[0]) : null;
  }

  async getLatestBySku(sku: string): Promise<CoresaPublicationDTO | null> {
    const rows = await this.queryRows(
      `
      SELECT *
      FROM coresa_meli_publications
      WHERE sku = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1
      `,
      [sku],
    );

    return rows.length ? this.toDTO(rows[0]) : null;
  }

  async getHistoryBySku(sku: string): Promise<CoresaPublicationDTO[]> {
    const rows = await this.queryRows(
      `
      SELECT *
      FROM coresa_meli_publications
      WHERE sku = ?
      ORDER BY created_at DESC, id DESC
      `,
      [sku],
    );

    return rows.map((row) => this.toDTO(row));
  }

  async getOpenBySku(sku: string): Promise<CoresaPublicationDTO | null> {
    const placeholders = OPEN_STATUSES.map(() => '?').join(', ');
    const rows = await this.queryRows(
      `
      SELECT *
      FROM coresa_meli_publications
      WHERE sku = ?
        AND status IN (${placeholders})
      ORDER BY created_at DESC, id DESC
      LIMIT 1
      `,
      [sku, ...OPEN_STATUSES],
    );

    return rows.length ? this.toDTO(rows[0]) : null;
  }

  async list(params: {
    filters: CoresaPublicationFilters;
    limit: number;
    offset: number;
  }): Promise<CoresaPublicationListResult> {
    const { whereSql, queryParams } = this.buildWhere(params.filters);
    const rows = await this.queryRows(
      `
      SELECT *
      FROM coresa_meli_publications
      ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
      `,
      [...queryParams, params.limit, params.offset],
    );
    const countResult: unknown = await this.entityManager.query(
      `
      SELECT COUNT(*) AS total
      FROM coresa_meli_publications
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

  private buildWhere(filters: CoresaPublicationFilters): {
    whereSql: string;
    queryParams: unknown[];
  } {
    const clauses: string[] = [];
    const queryParams: unknown[] = [];

    if (filters.sku) {
      clauses.push('sku = ?');
      queryParams.push(filters.sku);
    }

    if (filters.status) {
      clauses.push('status = ?');
      queryParams.push(filters.status);
    }

    if (filters.categoryId) {
      clauses.push('category_id = ?');
      queryParams.push(filters.categoryId);
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
  ): Promise<CoresaPublicationRow[]> {
    const result: unknown = await this.entityManager.query(sql, params);

    return result as CoresaPublicationRow[];
  }

  private toDTO(row: CoresaPublicationRow): CoresaPublicationDTO {
    return {
      id: Number(row.id),
      sku: row.sku,
      status: row.status,
      requestedBy: row.requested_by,
      coresaSnapshot: this.parseJsonValue(row.coresa_snapshot),
      draft: this.parseJsonValue(row.draft_json),
      aiModel: row.ai_model,
      aiGeneratedAt: this.toIsoStringOrNull(row.ai_generated_at),
      categoryId: row.category_id,
      validation: this.parseJsonValue(row.validation_json),
      classicItemId: row.classic_item_id,
      premiumItemId: row.premium_item_id,
      permalink: row.permalink,
      response: this.parseJsonValue(row.response_json),
      errorCode: row.error_code,
      errorMessage: row.error_message,
      publishedAt: this.toIsoStringOrNull(row.published_at),
      createdAt: this.toIsoStringOrNull(row.created_at),
      updatedAt: this.toIsoStringOrNull(row.updated_at),
    };
  }

  private normalizeValue(column: string, value: unknown): unknown {
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

  private getInsertId(result: unknown): number {
    if (
      result &&
      typeof result === 'object' &&
      'insertId' in result &&
      typeof (result as { insertId: unknown }).insertId === 'number'
    ) {
      return (result as { insertId: number }).insertId;
    }

    throw new Error(
      '[SQLCoresaPublicationsRepository] Could not read insertId from the database result',
    );
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
