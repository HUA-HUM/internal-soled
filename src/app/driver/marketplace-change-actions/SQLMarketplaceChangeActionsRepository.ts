import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import type { ISQLMarketplaceChangeActionsRepository } from 'src/core/adapters/marketplace-change-actions/ISQLMarketplaceChangeActionsRepository';
import {
  CreateMarketplaceChangeActionInput,
  MarketplaceChangeActionBulkItem,
  MarketplaceChangeActionDTO,
  MarketplaceChangeActionFilters,
  MarketplaceChangeActionListResult,
  MarketplaceChangeActionRow,
} from 'src/core/entitis/marketplace-change-actions/MarketplaceChangeActionTypes';
import { EntityManager } from 'typeorm';

@Injectable()
export class SQLMarketplaceChangeActionsRepository implements ISQLMarketplaceChangeActionsRepository {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async bulkCreateOrGet(
    actions: CreateMarketplaceChangeActionInput[],
  ): Promise<MarketplaceChangeActionBulkItem[]> {
    const items: MarketplaceChangeActionBulkItem[] = [];

    await this.entityManager.transaction(async (manager) => {
      for (const action of actions) {
        const insertResult: unknown = await manager.query(
          `
          INSERT IGNORE INTO marketplace_product_change_actions (
            action_id,
            dedupe_key,
            source,
            sku,
            meli_item_id,
            marketplace,
            change_type,
            status,
            old_value,
            new_value,
            publication_id,
            external_product_id,
            external_sku,
            attempts,
            max_attempts,
            queued_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?, 0, ?, NOW())
          `,
          [
            action.actionId,
            action.dedupeKey,
            action.source,
            action.sku,
            action.meliItemId ?? null,
            action.marketplace,
            action.changeType,
            this.stringifyJsonOrNull(action.oldValue),
            this.stringifyJsonOrNull(action.newValue),
            action.publicationId ?? null,
            action.externalProductId ?? null,
            action.externalSku ?? null,
            action.maxAttempts ?? 3,
          ],
        );
        const row = await this.getRowByDedupeKeyWithManager(
          manager,
          action.dedupeKey,
        );

        if (!row) {
          throw new Error(
            `[SQLMarketplaceChangeActionsRepository] Action was not saved: ${action.actionId}`,
          );
        }

        items.push({
          id: row.id,
          actionId: row.action_id,
          dedupeKey: row.dedupe_key,
          status: row.status,
          created: this.getAffectedRows(insertResult) > 0,
        });
      }
    });

    return items;
  }

  async getByActionId(
    actionId: string,
  ): Promise<MarketplaceChangeActionDTO | null> {
    const row = await this.getRowByActionId(actionId);

    return row ? this.toDTO(row) : null;
  }

  async list(params: {
    filters: MarketplaceChangeActionFilters;
    limit: number;
    offset: number;
  }): Promise<MarketplaceChangeActionListResult> {
    const { whereSql, queryParams } = this.buildWhere(params.filters);
    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT *
      FROM marketplace_product_change_actions
      ${whereSql}
      ORDER BY id ASC
      LIMIT ? OFFSET ?
      `,
      [...queryParams, params.limit, params.offset],
    );
    const rows = queryResult as MarketplaceChangeActionRow[];
    const countResult: unknown = await this.entityManager.query(
      `
      SELECT COUNT(*) AS total
      FROM marketplace_product_change_actions
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

  async markProcessing(
    actionId: string,
    input: {
      attempts: number;
      bullmqJobId?: string | null;
    },
  ): Promise<MarketplaceChangeActionDTO | null> {
    await this.entityManager.query(
      `
      UPDATE marketplace_product_change_actions
      SET
        status = 'processing',
        attempts = ?,
        bullmq_job_id = ?,
        started_at = NOW(),
        error_code = NULL,
        error_message = NULL
      WHERE action_id = ?
      `,
      [input.attempts, input.bullmqJobId ?? null, actionId],
    );

    return this.getByActionId(actionId);
  }

  async complete(
    actionId: string,
    input: {
      requestSnapshot?: unknown;
      responseSnapshot?: unknown;
    },
  ): Promise<MarketplaceChangeActionDTO | null> {
    await this.entityManager.query(
      `
      UPDATE marketplace_product_change_actions
      SET
        status = 'completed',
        request_snapshot = ?,
        response_snapshot = ?,
        finished_at = NOW(),
        error_code = NULL,
        error_message = NULL
      WHERE action_id = ?
      `,
      [
        this.stringifyJsonOrNull(input.requestSnapshot),
        this.stringifyJsonOrNull(input.responseSnapshot),
        actionId,
      ],
    );

    return this.getByActionId(actionId);
  }

  async fail(
    actionId: string,
    input: {
      attempts: number;
      errorCode: string;
      errorMessage: string;
      requestSnapshot?: unknown;
      responseSnapshot?: unknown;
    },
  ): Promise<MarketplaceChangeActionDTO | null> {
    await this.entityManager.query(
      `
      UPDATE marketplace_product_change_actions
      SET
        status = 'failed',
        attempts = ?,
        error_code = ?,
        error_message = ?,
        request_snapshot = ?,
        response_snapshot = ?,
        finished_at = NOW()
      WHERE action_id = ?
      `,
      [
        input.attempts,
        input.errorCode,
        input.errorMessage,
        this.stringifyJsonOrNull(input.requestSnapshot),
        this.stringifyJsonOrNull(input.responseSnapshot),
        actionId,
      ],
    );

    return this.getByActionId(actionId);
  }

  async skip(
    actionId: string,
    input: {
      reason: string;
      responseSnapshot?: unknown;
    },
  ): Promise<MarketplaceChangeActionDTO | null> {
    await this.entityManager.query(
      `
      UPDATE marketplace_product_change_actions
      SET
        status = 'skipped',
        error_message = ?,
        response_snapshot = ?,
        finished_at = NOW()
      WHERE action_id = ?
      `,
      [
        input.reason,
        this.stringifyJsonOrNull(input.responseSnapshot),
        actionId,
      ],
    );

    return this.getByActionId(actionId);
  }

  async updateBullmqJobId(
    actionId: string,
    bullmqJobId: string,
  ): Promise<MarketplaceChangeActionDTO | null> {
    await this.entityManager.query(
      `
      UPDATE marketplace_product_change_actions
      SET bullmq_job_id = ?
      WHERE action_id = ?
      `,
      [bullmqJobId, actionId],
    );

    return this.getByActionId(actionId);
  }

  private async getRowByActionId(
    actionId: string,
  ): Promise<MarketplaceChangeActionRow | null> {
    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT *
      FROM marketplace_product_change_actions
      WHERE action_id = ?
      LIMIT 1
      `,
      [actionId],
    );
    const rows = queryResult as MarketplaceChangeActionRow[];

    return rows.length ? rows[0] : null;
  }

  private async getRowByDedupeKeyWithManager(
    manager: EntityManager,
    dedupeKey: string,
  ): Promise<MarketplaceChangeActionRow | null> {
    const queryResult: unknown = await manager.query(
      `
      SELECT *
      FROM marketplace_product_change_actions
      WHERE dedupe_key = ?
      LIMIT 1
      `,
      [dedupeKey],
    );
    const rows = queryResult as MarketplaceChangeActionRow[];

    return rows.length ? rows[0] : null;
  }

  private buildWhere(filters: MarketplaceChangeActionFilters): {
    whereSql: string;
    queryParams: unknown[];
  } {
    const clauses: string[] = [];
    const queryParams: unknown[] = [];

    if (filters.sku) {
      clauses.push('sku = ?');
      queryParams.push(filters.sku);
    }

    if (filters.meliItemId) {
      clauses.push('meli_item_id = ?');
      queryParams.push(filters.meliItemId);
    }

    if (filters.marketplace) {
      clauses.push('marketplace = ?');
      queryParams.push(filters.marketplace);
    }

    if (filters.changeType) {
      clauses.push('change_type = ?');
      queryParams.push(filters.changeType);
    }

    if (filters.status) {
      clauses.push('status = ?');
      queryParams.push(filters.status);
    }

    if (filters.source) {
      clauses.push('source = ?');
      queryParams.push(filters.source);
    }

    return {
      whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
      queryParams,
    };
  }

  private toDTO(row: MarketplaceChangeActionRow): MarketplaceChangeActionDTO {
    return {
      id: row.id,
      actionId: row.action_id,
      dedupeKey: row.dedupe_key,
      source: row.source,
      sku: row.sku,
      meliItemId: row.meli_item_id,
      marketplace: row.marketplace,
      changeType: row.change_type,
      status: row.status,
      oldValue: this.parseJsonValue(row.old_value),
      newValue: this.parseJsonValue(row.new_value),
      publicationId: row.publication_id,
      externalProductId: row.external_product_id,
      externalSku: row.external_sku,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      bullmqJobId: row.bullmq_job_id,
      requestSnapshot: this.parseJsonValue(row.request_snapshot),
      responseSnapshot: this.parseJsonValue(row.response_snapshot),
      errorCode: row.error_code,
      errorMessage: row.error_message,
      queuedAt: this.toIsoStringOrNull(row.queued_at),
      startedAt: this.toIsoStringOrNull(row.started_at),
      finishedAt: this.toIsoStringOrNull(row.finished_at),
      createdAt: this.toIsoStringOrNull(row.created_at),
      updatedAt: this.toIsoStringOrNull(row.updated_at),
    };
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

  private getAffectedRows(result: unknown): number {
    if (
      result &&
      typeof result === 'object' &&
      'affectedRows' in result &&
      typeof result.affectedRows === 'number'
    ) {
      return result.affectedRows;
    }

    return 0;
  }
}
