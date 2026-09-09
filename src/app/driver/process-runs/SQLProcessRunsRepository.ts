import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import type { ISQLProcessRunsRepository } from 'src/core/adapters/process-runs/ISQLProcessRunsRepository';
import {
  CreateProcessRunInput,
  FinishProcessRunInput,
  ProcessRunAnalyticsBreakdown,
  ProcessRunAnalyticsFilters,
  ProcessRunAnalyticsResult,
  ProcessRunDTO,
  ProcessRunFilters,
  ProcessRunListResult,
  ProcessRunRow,
} from 'src/core/entitis/process-runs/ProcessRunTypes';
import { EntityManager } from 'typeorm';

/** Ventana por defecto de la analitica, en dias, cuando no se informan from/to. */
const DEFAULT_ANALYTICS_WINDOW_DAYS = 7;

/**
 * started_at y finished_at son DATETIME(3), asi que la resta da milisegundos
 * reales y no multiplos de 1000.
 */
const DURATION_MS_EXPRESSION =
  'FLOOR(TIMESTAMPDIFF(MICROSECOND, started_at, NOW(3)) / 1000)';

/**
 * El promedio de duracion se calcula solo sobre corridas completadas: una que
 * fallo por timeout no dice nada sobre cuanto tarda el proceso cuando funciona.
 */
const AVG_DURATION_EXPRESSION =
  "AVG(CASE WHEN status = 'completed' THEN duration_ms END)";

@Injectable()
export class SQLProcessRunsRepository implements ISQLProcessRunsRepository {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async create(input: CreateProcessRunInput): Promise<ProcessRunDTO> {
    const insertResult: unknown = await this.entityManager.query(
      `
      INSERT INTO process_runs (process_name, trigger_type, status, started_at)
      VALUES (?, ?, 'running', NOW(3))
      `,
      [input.processName, input.triggerType],
    );
    const id = this.getInsertId(insertResult);
    const run = await this.getById(id);

    if (!run) {
      throw new Error(
        `[SQLProcessRunsRepository] Process run was not saved: ${input.processName}`,
      );
    }

    return run;
  }

  async finish(
    id: number,
    input: FinishProcessRunInput,
  ): Promise<ProcessRunDTO | null> {
    const assignments = [
      'status = ?',
      'finished_at = NOW(3)',
      `duration_ms = ${DURATION_MS_EXPRESSION}`,
    ];
    const queryParams: unknown[] = [input.status];

    if (input.summary !== undefined) {
      assignments.splice(1, 0, 'summary_json = ?');
      queryParams.push(this.stringifyJsonOrNull(input.summary));
    }

    if (input.errorMessage !== undefined) {
      assignments.push('error_message = ?');
      queryParams.push(input.errorMessage);
    }

    await this.entityManager.query(
      `
      UPDATE process_runs
      SET ${assignments.join(', ')}
      WHERE id = ?
      `,
      [...queryParams, id],
    );

    return this.getById(id);
  }

  async list(params: {
    filters: ProcessRunFilters;
    limit: number;
    offset: number;
  }): Promise<ProcessRunListResult> {
    const { whereSql, queryParams } = this.buildWhere(params.filters);
    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT *
      FROM process_runs
      ${whereSql}
      ORDER BY started_at DESC, id DESC
      LIMIT ? OFFSET ?
      `,
      [...queryParams, params.limit, params.offset],
    );
    const rows = queryResult as ProcessRunRow[];
    const countResult: unknown = await this.entityManager.query(
      `
      SELECT COUNT(*) AS total
      FROM process_runs
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
    filters: ProcessRunAnalyticsFilters,
  ): Promise<ProcessRunAnalyticsResult> {
    const to = filters.to ?? (await this.getDatabaseDate());
    const from =
      filters.from ?? this.shiftDate(to, -(DEFAULT_ANALYTICS_WINDOW_DAYS - 1));
    const { whereSql, queryParams } = this.buildAnalyticsWhere(
      from,
      to,
      filters,
    );

    const [
      summaryResult,
      processResult,
      statusResult,
      triggerResult,
      dayResult,
    ] = await Promise.all([
      this.queryRows(
        `
          SELECT
            COUNT(*) AS total_runs,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_runs,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_runs,
            SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running_runs,
            COUNT(DISTINCT process_name) AS unique_processes,
            ${AVG_DURATION_EXPRESSION} AS average_duration_ms,
            MIN(CASE WHEN status = 'completed' THEN duration_ms END) AS min_duration_ms,
            MAX(CASE WHEN status = 'completed' THEN duration_ms END) AS max_duration_ms
          FROM process_runs
          ${whereSql}
          `,
        queryParams,
      ),
      this.queryRows(
        `
          SELECT
            process_name AS name,
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
            SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running,
            ${AVG_DURATION_EXPRESSION} AS average_duration_ms,
            MAX(started_at) AS last_run_at
          FROM process_runs
          ${whereSql}
          GROUP BY process_name
          ORDER BY total DESC, name ASC
          `,
        queryParams,
      ),
      this.queryRows(
        `
          SELECT status AS name, COUNT(*) AS total
          FROM process_runs
          ${whereSql}
          GROUP BY status
          ORDER BY total DESC
          `,
        queryParams,
      ),
      this.queryRows(
        `
          SELECT trigger_type AS name, COUNT(*) AS total
          FROM process_runs
          ${whereSql}
          GROUP BY trigger_type
          ORDER BY total DESC
          `,
        queryParams,
      ),
      this.queryRows(
        `
          SELECT
            DATE_FORMAT(started_at, '%Y-%m-%d') AS date,
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
          FROM process_runs
          ${whereSql}
          GROUP BY DATE_FORMAT(started_at, '%Y-%m-%d')
          ORDER BY date ASC
          `,
        queryParams,
      ),
    ]);

    const summary = summaryResult[0] ?? {};
    const totalRuns = this.toNumber(summary.total_runs);
    const completedRuns = this.toNumber(summary.completed_runs);

    return {
      period: { from, to, timezone: 'database' },
      filters: { processName: filters.processName },
      summary: {
        totalRuns,
        completedRuns,
        failedRuns: this.toNumber(summary.failed_runs),
        runningRuns: this.toNumber(summary.running_runs),
        successRate: totalRuns
          ? Number(((completedRuns / totalRuns) * 100).toFixed(2))
          : 0,
        uniqueProcesses: this.toNumber(summary.unique_processes),
        averageDurationMs: this.toNullableNumber(summary.average_duration_ms),
        minDurationMs: this.toNullableNumber(summary.min_duration_ms),
        maxDurationMs: this.toNullableNumber(summary.max_duration_ms),
      },
      byProcess: processResult.map((row) => this.toProcessBreakdown(row)),
      byStatus: statusResult.map((row) => ({
        name: String(row.name),
        total: this.toNumber(row.total),
      })),
      byTriggerType: triggerResult.map((row) => ({
        name: String(row.name),
        total: this.toNumber(row.total),
      })),
      byDay: dayResult.map((row) => ({
        date: String(row.date),
        total: this.toNumber(row.total),
        completed: this.toNumber(row.completed),
        failed: this.toNumber(row.failed),
      })),
    };
  }

  private async getById(id: number): Promise<ProcessRunDTO | null> {
    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT *
      FROM process_runs
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );
    const rows = queryResult as ProcessRunRow[];

    return rows.length ? this.toDTO(rows[0]) : null;
  }

  private buildWhere(filters: ProcessRunFilters): {
    whereSql: string;
    queryParams: unknown[];
  } {
    const clauses: string[] = [];
    const queryParams: unknown[] = [];

    if (filters.processName) {
      clauses.push('process_name = ?');
      queryParams.push(filters.processName);
    }

    if (filters.status) {
      clauses.push('status = ?');
      queryParams.push(filters.status);
    }

    if (filters.triggerType) {
      clauses.push('trigger_type = ?');
      queryParams.push(filters.triggerType);
    }

    if (filters.from) {
      clauses.push('started_at >= ?');
      queryParams.push(`${filters.from} 00:00:00`);
    }

    if (filters.to) {
      clauses.push('started_at < DATE_ADD(?, INTERVAL 1 DAY)');
      queryParams.push(`${filters.to} 00:00:00`);
    }

    return {
      whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
      queryParams,
    };
  }

  private buildAnalyticsWhere(
    from: string,
    to: string,
    filters: ProcessRunAnalyticsFilters,
  ): { whereSql: string; queryParams: unknown[] } {
    const clauses = [
      'started_at >= ?',
      'started_at < DATE_ADD(?, INTERVAL 1 DAY)',
    ];
    const queryParams: unknown[] = [`${from} 00:00:00`, `${to} 00:00:00`];

    if (filters.processName) {
      clauses.push('process_name = ?');
      queryParams.push(filters.processName);
    }

    return {
      whereSql: `WHERE ${clauses.join(' AND ')}`,
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

  private shiftDate(date: string, days: number): string {
    const shifted = new Date(`${date}T00:00:00Z`);

    shifted.setUTCDate(shifted.getUTCDate() + days);

    return shifted.toISOString().slice(0, 10);
  }

  private async queryRows(
    sql: string,
    params: unknown[],
  ): Promise<Record<string, unknown>[]> {
    const result: unknown = await this.entityManager.query(sql, params);

    return result as Record<string, unknown>[];
  }

  private toProcessBreakdown(
    row: Record<string, unknown>,
  ): ProcessRunAnalyticsBreakdown {
    return {
      name: String(row.name),
      total: this.toNumber(row.total),
      completed: this.toNumber(row.completed),
      failed: this.toNumber(row.failed),
      running: this.toNumber(row.running),
      averageDurationMs: this.toNullableNumber(row.average_duration_ms),
      lastRunAt: this.toIsoStringOrNull(
        (row.last_run_at as Date | string | null) ?? null,
      ),
    };
  }

  private toDTO(row: ProcessRunRow): ProcessRunDTO {
    return {
      id: Number(row.id),
      processName: row.process_name,
      triggerType: row.trigger_type,
      status: row.status,
      startedAt: this.toIsoStringOrNull(row.started_at),
      finishedAt: this.toIsoStringOrNull(row.finished_at),
      durationMs:
        row.duration_ms === null || row.duration_ms === undefined
          ? null
          : Number(row.duration_ms),
      summary: this.parseJsonValue(row.summary_json),
      errorMessage: row.error_message,
      createdAt: this.toIsoStringOrNull(row.created_at),
      updatedAt: this.toIsoStringOrNull(row.updated_at),
    };
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
      '[SQLProcessRunsRepository] Could not read insertId from the database result',
    );
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
}
