import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import type { ISQLMarketplaceChangeActionsRepository } from 'src/core/adapters/marketplace-change-actions/ISQLMarketplaceChangeActionsRepository';
import {
  CreateMarketplaceChangeActionInput,
  MarketplaceChangeActionAnalyticsBreakdown,
  MarketplaceChangeActionAnalyticsFilters,
  MarketplaceChangeActionAnalyticsResult,
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

  async getAnalytics(
    filters: MarketplaceChangeActionAnalyticsFilters,
  ): Promise<MarketplaceChangeActionAnalyticsResult> {
    const date = filters.date ?? (await this.getDatabaseDate());
    const { whereSql, queryParams } = this.buildAnalyticsWhere(date, filters);
    const completedExpression =
      "SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END)";
    const failedExpression =
      "SUM(CASE WHEN a.status = 'failed' THEN 1 ELSE 0 END)";
    const activationCondition = `
      a.change_type = 'status'
      AND LOWER(COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(a.new_value, '$.status')),
        JSON_UNQUOTE(JSON_EXTRACT(a.new_value, '$.active')),
        JSON_UNQUOTE(JSON_EXTRACT(a.new_value, '$.enabled')),
        JSON_UNQUOTE(a.new_value)
      )) IN ('active', 'activated', 'published', 'true', '1')
    `;

    const [
      summaryResult,
      changeTypeResult,
      statusResult,
      marketplaceResult,
      brandResult,
      sourceResult,
      hourResult,
      skuResult,
      errorResult,
    ] = await Promise.all([
      this.queryAnalyticsRows(
        `
        SELECT
          COUNT(*) AS total_actions,
          ${completedExpression} AS completed_actions,
          ${failedExpression} AS failed_actions,
          SUM(CASE WHEN a.status IN ('queued', 'processing') THEN 1 ELSE 0 END) AS pending_actions,
          COUNT(DISTINCT a.sku) AS unique_skus,
          COUNT(DISTINCT a.meli_item_id) AS unique_meli_items,
          SUM(CASE WHEN ${activationCondition} THEN 1 ELSE 0 END) AS activations,
          SUM(CASE WHEN ${activationCondition} AND a.status = 'completed' THEN 1 ELSE 0 END) AS completed_activations,
          SUM(CASE WHEN a.change_type = 'price' THEN 1 ELSE 0 END) AS price_changes,
          SUM(CASE WHEN a.change_type = 'price' AND a.status = 'completed' THEN 1 ELSE 0 END) AS completed_price_changes,
          SUM(CASE WHEN a.change_type = 'stock' THEN 1 ELSE 0 END) AS stock_changes,
          SUM(CASE WHEN a.change_type = 'stock' AND a.status = 'completed' THEN 1 ELSE 0 END) AS completed_stock_changes,
          SUM(CASE WHEN a.change_type = 'status' THEN 1 ELSE 0 END) AS status_changes,
          SUM(CASE WHEN a.change_type = 'status' AND a.status = 'completed' THEN 1 ELSE 0 END) AS completed_status_changes,
          AVG(
            CASE
              WHEN a.started_at IS NOT NULL AND a.finished_at IS NOT NULL
              THEN TIMESTAMPDIFF(MICROSECOND, a.started_at, a.finished_at) / 1000
              ELSE NULL
            END
          ) AS average_processing_time_ms
        FROM marketplace_product_change_actions a
        ${whereSql}
        `,
        queryParams,
      ),
      this.queryAnalyticsRows(
        `
        SELECT a.change_type AS name, COUNT(*) AS total,
          ${completedExpression} AS completed, ${failedExpression} AS failed
        FROM marketplace_product_change_actions a
        ${whereSql}
        GROUP BY a.change_type
        ORDER BY total DESC, name ASC
        `,
        queryParams,
      ),
      this.queryAnalyticsRows(
        `
        SELECT a.status AS name, COUNT(*) AS total
        FROM marketplace_product_change_actions a
        ${whereSql}
        GROUP BY a.status
        ORDER BY total DESC, name ASC
        `,
        queryParams,
      ),
      this.queryAnalyticsRows(
        `
        SELECT a.marketplace AS name, COUNT(*) AS total,
          ${completedExpression} AS completed, ${failedExpression} AS failed
        FROM marketplace_product_change_actions a
        ${whereSql}
        GROUP BY a.marketplace
        ORDER BY total DESC, name ASC
        `,
        queryParams,
      ),
      this.queryAnalyticsRows(
        `
        SELECT COALESCE(NULLIF(TRIM(p.brand), ''), 'Sin marca') AS name,
          COUNT(*) AS total, ${completedExpression} AS completed,
          ${failedExpression} AS failed
        FROM marketplace_product_change_actions a
        LEFT JOIN marketplace_product_publications p ON p.id = a.publication_id
        ${whereSql}
        GROUP BY COALESCE(NULLIF(TRIM(p.brand), ''), 'Sin marca')
        ORDER BY total DESC, name ASC
        `,
        queryParams,
      ),
      this.queryAnalyticsRows(
        `
        SELECT a.source AS name, COUNT(*) AS total,
          ${completedExpression} AS completed, ${failedExpression} AS failed
        FROM marketplace_product_change_actions a
        ${whereSql}
        GROUP BY a.source
        ORDER BY total DESC, name ASC
        `,
        queryParams,
      ),
      this.queryAnalyticsRows(
        `
        SELECT HOUR(a.created_at) AS hour, COUNT(*) AS total,
          ${completedExpression} AS completed, ${failedExpression} AS failed
        FROM marketplace_product_change_actions a
        ${whereSql}
        GROUP BY HOUR(a.created_at)
        ORDER BY hour ASC
        `,
        queryParams,
      ),
      this.queryAnalyticsRows(
        `
        SELECT a.sku, COUNT(*) AS total,
          ${completedExpression} AS completed, ${failedExpression} AS failed,
          SUM(CASE WHEN a.change_type = 'price' THEN 1 ELSE 0 END) AS price_changes,
          SUM(CASE WHEN a.change_type = 'stock' THEN 1 ELSE 0 END) AS stock_changes,
          SUM(CASE WHEN a.change_type = 'status' THEN 1 ELSE 0 END) AS status_changes
        FROM marketplace_product_change_actions a
        ${whereSql}
        GROUP BY a.sku
        ORDER BY total DESC, a.sku ASC
        LIMIT 20
        `,
        queryParams,
      ),
      this.queryAnalyticsRows(
        `
        SELECT COALESCE(a.error_code, 'SIN_CODIGO') AS code,
          a.error_message AS message, COUNT(*) AS total
        FROM marketplace_product_change_actions a
        ${whereSql} AND a.status = 'failed'
        GROUP BY COALESCE(a.error_code, 'SIN_CODIGO'), a.error_message
        ORDER BY total DESC, code ASC
        LIMIT 10
        `,
        queryParams,
      ),
    ]);

    const summary = summaryResult[0] ?? {};
    const totalActions = this.toNumber(summary.total_actions);
    const completedActions = this.toNumber(summary.completed_actions);
    const hoursByHour = new Map(
      hourResult.map((row) => [this.toNumber(row.hour), row]),
    );

    return {
      period: {
        date,
        start: `${date} 00:00:00`,
        end: `${date} 23:59:59`,
        timezone: 'database',
      },
      filters: {
        marketplace: filters.marketplace,
        status: filters.status,
        source: filters.source,
      },
      summary: {
        totalActions,
        completedActions,
        failedActions: this.toNumber(summary.failed_actions),
        pendingActions: this.toNumber(summary.pending_actions),
        successRate:
          totalActions === 0
            ? 0
            : Number(((completedActions / totalActions) * 100).toFixed(2)),
        uniqueSkus: this.toNumber(summary.unique_skus),
        uniqueMeliItems: this.toNumber(summary.unique_meli_items),
        activations: this.toNumber(summary.activations),
        completedActivations: this.toNumber(summary.completed_activations),
        priceChanges: this.toNumber(summary.price_changes),
        completedPriceChanges: this.toNumber(summary.completed_price_changes),
        stockChanges: this.toNumber(summary.stock_changes),
        completedStockChanges: this.toNumber(summary.completed_stock_changes),
        statusChanges: this.toNumber(summary.status_changes),
        completedStatusChanges: this.toNumber(summary.completed_status_changes),
        averageProcessingTimeMs: this.toNullableNumber(
          summary.average_processing_time_ms,
        ),
      },
      byChangeType: this.toAnalyticsBreakdown(changeTypeResult),
      byStatus: statusResult.map((row) => ({
        name: String(row.name),
        total: this.toNumber(row.total),
      })),
      byMarketplace: this.toAnalyticsBreakdown(marketplaceResult),
      byBrand: this.toAnalyticsBreakdown(brandResult),
      bySource: this.toAnalyticsBreakdown(sourceResult),
      byHour: Array.from({ length: 24 }, (_, hour) => {
        const row = hoursByHour.get(hour);

        return {
          hour,
          total: this.toNumber(row?.total),
          completed: this.toNumber(row?.completed),
          failed: this.toNumber(row?.failed),
        };
      }),
      topSkus: skuResult.map((row) => ({
        sku: String(row.sku),
        total: this.toNumber(row.total),
        completed: this.toNumber(row.completed),
        failed: this.toNumber(row.failed),
        priceChanges: this.toNumber(row.price_changes),
        stockChanges: this.toNumber(row.stock_changes),
        statusChanges: this.toNumber(row.status_changes),
      })),
      topErrors: errorResult.map((row) => ({
        code: String(row.code),
        message: typeof row.message === 'string' ? row.message : null,
        total: this.toNumber(row.total),
      })),
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

  private async getDatabaseDate(): Promise<string> {
    const queryResult: unknown = await this.entityManager.query(
      "SELECT DATE_FORMAT(CURRENT_DATE(), '%Y-%m-%d') AS date",
    );
    const rows = queryResult as { date: string }[];

    return rows[0].date;
  }

  private async queryAnalyticsRows(
    sql: string,
    params: unknown[],
  ): Promise<Record<string, unknown>[]> {
    const result: unknown = await this.entityManager.query(sql, params);

    return result as Record<string, unknown>[];
  }

  private buildAnalyticsWhere(
    date: string,
    filters: MarketplaceChangeActionAnalyticsFilters,
  ): { whereSql: string; queryParams: unknown[] } {
    const clauses = [
      'a.created_at >= ?',
      'a.created_at < DATE_ADD(?, INTERVAL 1 DAY)',
    ];
    const queryParams: unknown[] = [`${date} 00:00:00`, `${date} 00:00:00`];

    if (filters.marketplace) {
      clauses.push('a.marketplace = ?');
      queryParams.push(filters.marketplace);
    }

    if (filters.status) {
      clauses.push('a.status = ?');
      queryParams.push(filters.status);
    }

    if (filters.source) {
      clauses.push('a.source = ?');
      queryParams.push(filters.source);
    }

    return {
      whereSql: `WHERE ${clauses.join(' AND ')}`,
      queryParams,
    };
  }

  private toAnalyticsBreakdown(
    result: unknown,
  ): MarketplaceChangeActionAnalyticsBreakdown[] {
    return (result as Record<string, unknown>[]).map((row) => ({
      name: String(row.name),
      total: this.toNumber(row.total),
      completed: this.toNumber(row.completed),
      failed: this.toNumber(row.failed),
    }));
  }

  private toNumber(value: unknown): number {
    const number = Number(value ?? 0);

    return Number.isFinite(number) ? number : 0;
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? Number(number.toFixed(2)) : null;
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
