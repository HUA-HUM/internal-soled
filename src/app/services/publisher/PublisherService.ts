import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ISQLPublisherRepository } from 'src/core/adapters/publisher/ISQLPublisherRepository';
import {
  PublisherJobDetail,
  PublisherJobRow,
  PublisherListResult,
  PublisherRunRow,
  PublisherRunStatus,
  UpdatePublisherRunSnapshotsInput,
  UpdatePublisherRunStatusInput,
} from 'src/core/entitis/publisher/PublisherTypes';
import { CreatePublisherJobDTO } from 'src/app/controller/publisher/internal/dto/PublisherDTO';

@Injectable()
export class PublisherService {
  constructor(
    @Inject('ISQLPublisherRepository')
    private readonly publisherRepository: ISQLPublisherRepository,
  ) {}

  createJob(body: CreatePublisherJobDTO): Promise<PublisherJobDetail> {
    const skus = this.uniqueNonEmptyValues(body.skus, 'skus');
    const marketplaces = this.uniqueNonEmptyValues(
      body.marketplaces,
      'marketplaces',
    );

    return this.publisherRepository.createJob({
      source: body.source ?? 'mercadolibre',
      skus,
      marketplaces,
      requestedBy: body.requestedBy,
      options: body.options ?? {},
      idempotencyKey: body.idempotencyKey ?? null,
      originalRequest: body as unknown as Record<string, unknown>,
    });
  }

  async getJob(jobId: string): Promise<PublisherJobDetail> {
    const job = await this.publisherRepository.getJob(jobId);

    if (!job) {
      throw new NotFoundException('Publisher job not found');
    }

    return job;
  }

  listJobs(params: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PublisherListResult<PublisherJobRow>> {
    return this.publisherRepository.listJobs({
      status: params.status,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    });
  }

  listRuns(params: {
    status?: PublisherRunStatus;
    limit?: number;
  }): Promise<{ items: PublisherRunRow[] }> {
    return this.publisherRepository.listRuns({
      status: params.status,
      limit: params.limit ?? 100,
    });
  }

  async getRun(runId: string): Promise<PublisherRunRow> {
    const run = await this.publisherRepository.getRun(runId);

    if (!run) {
      throw new NotFoundException('Publisher run not found');
    }

    return run;
  }

  async updateRunStatus(
    runId: string,
    input: UpdatePublisherRunStatusInput,
  ): Promise<{ ok: true; runId: string; status: PublisherRunStatus }> {
    const run = await this.publisherRepository.updateRunStatus(runId, input);

    if (!run) {
      throw new NotFoundException('Publisher run not found');
    }

    return {
      ok: true,
      runId: run.run_id,
      status: run.status,
    };
  }

  async updateRunSnapshots(
    runId: string,
    input: UpdatePublisherRunSnapshotsInput,
  ): Promise<{ ok: true }> {
    const run = await this.publisherRepository.updateRunSnapshots(runId, input);

    if (!run) {
      throw new NotFoundException('Publisher run not found');
    }

    return { ok: true };
  }

  async retryRun(
    runId: string,
  ): Promise<{ ok: true; runId: string; status: PublisherRunStatus }> {
    const run = await this.publisherRepository.retryRun(runId);

    if (!run) {
      throw new NotFoundException('Publisher run not found');
    }

    return {
      ok: true,
      runId: run.run_id,
      status: run.status,
    };
  }

  async cancelJob(
    jobId: string,
  ): Promise<{ ok: true; jobId: string; status: string }> {
    const job = await this.publisherRepository.cancelJob(jobId);

    if (!job) {
      throw new NotFoundException('Publisher job not found');
    }

    return {
      ok: true,
      jobId: job.job_id,
      status: job.status,
    };
  }

  private uniqueNonEmptyValues(values: string[], label: string): string[] {
    const normalized = [
      ...new Set(values.map((value) => value?.trim())),
    ].filter(Boolean);

    if (!normalized.length) {
      throw new BadRequestException(`${label} must contain valid values`);
    }

    return normalized;
  }
}
