import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import type { ISQLPublisherRepository } from 'src/core/adapters/publisher/ISQLPublisherRepository';
import {
  CreatePublisherJobInput,
  PublisherJobDetail,
  PublisherJobRow,
  PublisherListResult,
  PublisherRunRow,
  PublisherRunStatus,
  UpdatePublisherRunSnapshotsInput,
  UpdatePublisherRunStatusInput,
} from 'src/core/entitis/publisher/PublisherTypes';
import { EntityManager } from 'typeorm';

@Injectable()
export class SQLPublisherRepository implements ISQLPublisherRepository {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async createJob(input: CreatePublisherJobInput): Promise<PublisherJobDetail> {
    if (input.idempotencyKey) {
      const existing = await this.getJobByIdempotencyKey(input.idempotencyKey);

      if (existing) {
        const detail = await this.getJob(existing.job_id);

        if (detail) {
          return detail;
        }
      }
    }

    const jobId = this.createPublicId('pub');
    const runs = this.createRunDefinitions(jobId, input);

    await this.entityManager.transaction(async (manager) => {
      await manager.query(
        `
        INSERT INTO publisher_jobs (
          job_id,
          source,
          status,
          total_items,
          queued_items,
          requested_by_odoo_user_id,
          requested_by_name,
          requested_by_email,
          options,
          original_request,
          idempotency_key
        ) VALUES (?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          jobId,
          input.source,
          runs.length,
          runs.length,
          input.requestedBy?.odooUserId ?? null,
          input.requestedBy?.name ?? null,
          input.requestedBy?.email ?? null,
          this.stringifyJson(input.options ?? {}),
          this.stringifyJson(input.originalRequest),
          input.idempotencyKey ?? null,
        ],
      );

      for (const run of runs) {
        await manager.query(
          `
          INSERT INTO publisher_job_runs (
            run_id,
            job_id,
            sku,
            marketplace,
            source,
            status
          ) VALUES (?, ?, ?, ?, ?, 'queued')
          `,
          [run.runId, jobId, run.sku, run.marketplace, input.source],
        );
      }
    });

    const created = await this.getJob(jobId);

    if (!created) {
      throw new Error(`[SQLPublisherRepository] Job was not created: ${jobId}`);
    }

    return created;
  }

  async getJob(jobId: string): Promise<PublisherJobDetail | null> {
    const job = await this.getJobRow(jobId);

    if (!job) {
      return null;
    }

    const items = await this.getRunsByJobId(jobId);

    return {
      ...job,
      progress: this.calculateProgress(job),
      items,
    };
  }

  async listJobs(params: {
    status?: string;
    limit: number;
    offset: number;
  }): Promise<PublisherListResult<PublisherJobRow>> {
    const whereSql = params.status ? 'WHERE status = ?' : '';
    const whereParams = params.status ? [params.status] : [];

    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT *
      FROM publisher_jobs
      ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
      `,
      [...whereParams, params.limit, params.offset],
    );
    const items = queryResult as PublisherJobRow[];

    const countResult: unknown = await this.entityManager.query(
      `
      SELECT COUNT(*) AS total
      FROM publisher_jobs
      ${whereSql}
      `,
      whereParams,
    );
    const countRows = countResult as { total: string | number }[];

    return {
      items,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: Number(countRows[0]?.total ?? 0),
      },
    };
  }

  async listRuns(params: {
    status?: PublisherRunStatus;
    limit: number;
  }): Promise<{ items: PublisherRunRow[] }> {
    const whereSql = params.status ? 'WHERE status = ?' : '';
    const whereParams = params.status ? [params.status] : [];

    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT *
      FROM publisher_job_runs
      ${whereSql}
      ORDER BY id ASC
      LIMIT ?
      `,
      [...whereParams, params.limit],
    );

    return {
      items: queryResult as PublisherRunRow[],
    };
  }

  async getRun(runId: string): Promise<PublisherRunRow | null> {
    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT *
      FROM publisher_job_runs
      WHERE run_id = ?
      LIMIT 1
      `,
      [runId],
    );
    const rows = queryResult as PublisherRunRow[];

    return rows.length ? rows[0] : null;
  }

  async updateRunStatus(
    runId: string,
    input: UpdatePublisherRunStatusInput,
  ): Promise<PublisherRunRow | null> {
    const run = await this.getRun(runId);

    if (!run) {
      return null;
    }

    await this.entityManager.transaction(async (manager) => {
      await manager.query(
        `
        UPDATE publisher_job_runs
        SET
          status = ?,
          attempts = CASE
            WHEN ? IN ('retrying', 'failed') THEN attempts + 1
            ELSE attempts
          END,
          bullmq_job_id = COALESCE(?, bullmq_job_id),
          message = ?,
          error_code = ?,
          error_message = ?,
          response_snapshot = COALESCE(?, response_snapshot),
          marketplace_publication_id = COALESCE(?, marketplace_publication_id),
          external_product_id = COALESCE(?, external_product_id),
          started_at = CASE
            WHEN ? = 'processing' AND started_at IS NULL THEN NOW()
            ELSE started_at
          END,
          finished_at = CASE
            WHEN ? IN ('completed', 'failed', 'skipped', 'cancelled') THEN NOW()
            ELSE finished_at
          END
        WHERE run_id = ?
        `,
        [
          input.status,
          input.status,
          input.bullmqJobId ?? null,
          input.message ?? null,
          input.errorCode ?? null,
          input.errorMessage ?? null,
          this.stringifyJsonOrNull(input.responseSnapshot),
          input.marketplacePublicationId ?? null,
          input.externalProductId ?? null,
          input.status,
          input.status,
          runId,
        ],
      );

      await this.recalculateJobCounters(manager, run.job_id);
    });

    return this.getRun(runId);
  }

  async updateRunSnapshots(
    runId: string,
    input: UpdatePublisherRunSnapshotsInput,
  ): Promise<PublisherRunRow | null> {
    const run = await this.getRun(runId);

    if (!run) {
      return null;
    }

    await this.entityManager.query(
      `
      UPDATE publisher_job_runs
      SET
        source_product_snapshot = COALESCE(?, source_product_snapshot),
        payload_snapshot = COALESCE(?, payload_snapshot),
        response_snapshot = COALESCE(?, response_snapshot)
      WHERE run_id = ?
      `,
      [
        this.stringifyJsonOrNull(input.sourceProductSnapshot),
        this.stringifyJsonOrNull(input.payloadSnapshot),
        this.stringifyJsonOrNull(input.responseSnapshot),
        runId,
      ],
    );

    return this.getRun(runId);
  }

  async retryRun(runId: string): Promise<PublisherRunRow | null> {
    const run = await this.getRun(runId);

    if (!run) {
      return null;
    }

    await this.entityManager.transaction(async (manager) => {
      await manager.query(
        `
        UPDATE publisher_job_runs
        SET
          status = 'queued',
          message = 'Retry requested',
          error_message = NULL,
          error_code = NULL,
          finished_at = NULL
        WHERE run_id = ?
        `,
        [runId],
      );

      await this.recalculateJobCounters(manager, run.job_id);
    });

    return this.getRun(runId);
  }

  async cancelJob(jobId: string): Promise<PublisherJobDetail | null> {
    const job = await this.getJobRow(jobId);

    if (!job) {
      return null;
    }

    await this.entityManager.transaction(async (manager) => {
      await manager.query(
        `
        UPDATE publisher_job_runs
        SET
          status = 'cancelled',
          message = 'Job cancelled',
          finished_at = NOW()
        WHERE job_id = ?
          AND status IN ('queued', 'processing', 'retrying')
        `,
        [jobId],
      );

      await this.recalculateJobCounters(manager, jobId);
    });

    return this.getJob(jobId);
  }

  private async getJobByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<PublisherJobRow | null> {
    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT *
      FROM publisher_jobs
      WHERE idempotency_key = ?
      LIMIT 1
      `,
      [idempotencyKey],
    );
    const rows = queryResult as PublisherJobRow[];

    return rows.length ? rows[0] : null;
  }

  private async getJobRow(jobId: string): Promise<PublisherJobRow | null> {
    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT *
      FROM publisher_jobs
      WHERE job_id = ?
      LIMIT 1
      `,
      [jobId],
    );
    const rows = queryResult as PublisherJobRow[];

    return rows.length ? rows[0] : null;
  }

  private async getRunsByJobId(jobId: string): Promise<PublisherRunRow[]> {
    const queryResult: unknown = await this.entityManager.query(
      `
      SELECT *
      FROM publisher_job_runs
      WHERE job_id = ?
      ORDER BY id ASC
      `,
      [jobId],
    );

    return queryResult as PublisherRunRow[];
  }

  private async recalculateJobCounters(
    manager: EntityManager,
    jobId: string,
  ): Promise<void> {
    const queryResult: unknown = await manager.query(
      `
      SELECT
        COUNT(*) AS total_items,
        SUM(status = 'queued') AS queued_items,
        SUM(status = 'processing') AS processing_items,
        SUM(status = 'completed') AS done_items,
        SUM(status = 'failed') AS error_items,
        SUM(status = 'skipped') AS skipped_items,
        SUM(status = 'retrying') AS retrying_items,
        SUM(status = 'cancelled') AS cancelled_items
      FROM publisher_job_runs
      WHERE job_id = ?
      `,
      [jobId],
    );
    const rows = queryResult as Array<Record<string, string | number | null>>;
    const counts = rows[0] ?? {};
    const totalItems = Number(counts.total_items ?? 0);
    const queuedItems = Number(counts.queued_items ?? 0);
    const processingItems = Number(counts.processing_items ?? 0);
    const doneItems = Number(counts.done_items ?? 0);
    const errorItems = Number(counts.error_items ?? 0);
    const skippedItems = Number(counts.skipped_items ?? 0);
    const retryingItems = Number(counts.retrying_items ?? 0);
    const cancelledItems = Number(counts.cancelled_items ?? 0);
    const terminalItems =
      doneItems + errorItems + skippedItems + cancelledItems;
    const status = this.resolveJobStatus({
      totalItems,
      queuedItems,
      processingItems,
      retryingItems,
      doneItems,
      errorItems,
      skippedItems,
      cancelledItems,
    });

    await manager.query(
      `
      UPDATE publisher_jobs
      SET
        status = ?,
        total_items = ?,
        queued_items = ?,
        processing_items = ?,
        done_items = ?,
        error_items = ?,
        skipped_items = ?,
        started_at = CASE
          WHEN ? > 0 AND started_at IS NULL THEN NOW()
          ELSE started_at
        END,
        finished_at = CASE
          WHEN ? = ? THEN NOW()
          ELSE finished_at
        END
      WHERE job_id = ?
      `,
      [
        status,
        totalItems,
        queuedItems,
        processingItems,
        doneItems,
        errorItems,
        skippedItems,
        processingItems + doneItems + errorItems + skippedItems,
        terminalItems,
        totalItems,
        jobId,
      ],
    );
  }

  private resolveJobStatus(counts: {
    totalItems: number;
    queuedItems: number;
    processingItems: number;
    retryingItems: number;
    doneItems: number;
    errorItems: number;
    skippedItems: number;
    cancelledItems: number;
  }): PublisherJobRow['status'] {
    if (counts.totalItems === 0) {
      return 'queued';
    }

    if (counts.cancelledItems === counts.totalItems) {
      return 'cancelled';
    }

    if (
      counts.queuedItems > 0 ||
      counts.processingItems > 0 ||
      counts.retryingItems > 0
    ) {
      return counts.processingItems > 0 || counts.retryingItems > 0
        ? 'processing'
        : 'queued';
    }

    if (counts.doneItems + counts.skippedItems === counts.totalItems) {
      return 'completed';
    }

    if (counts.doneItems > 0 || counts.skippedItems > 0) {
      return 'completed_with_errors';
    }

    return 'failed';
  }

  private calculateProgress(job: PublisherJobRow): number {
    if (job.total_items <= 0) {
      return 0;
    }

    return Math.round(
      ((job.done_items + job.error_items + job.skipped_items) /
        job.total_items) *
        100,
    );
  }

  private createRunDefinitions(
    jobId: string,
    input: CreatePublisherJobInput,
  ): Array<{ runId: string; sku: string; marketplace: string }> {
    const runs: Array<{ runId: string; sku: string; marketplace: string }> = [];

    for (const sku of input.skus) {
      for (const marketplace of input.marketplaces) {
        runs.push({
          runId: this.createPublicId('run'),
          sku,
          marketplace,
        });
      }
    }

    return runs;
  }

  private createPublicId(prefix: string): string {
    return `${prefix}_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  private stringifyJson(value: unknown): string {
    return JSON.stringify(value);
  }

  private stringifyJsonOrNull(value: unknown): string | null {
    if (value === undefined) {
      return null;
    }

    return JSON.stringify(value);
  }
}
