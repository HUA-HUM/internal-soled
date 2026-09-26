import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  BulkCoresaSyncChangesDTO,
  CoresaSyncChangeStatsQueryDTO,
  ListCoresaSyncChangesQueryDTO,
} from 'src/app/controller/coresa-sync-changes/internal/dto/CoresaSyncChangeDTO';
import type { ISQLCoresaSyncChangesRepository } from 'src/core/adapters/coresa-sync-changes/ISQLCoresaSyncChangesRepository';
import {
  CoresaSyncChangeListResult,
  CoresaSyncChangeStatsResult,
  CreateCoresaSyncChangeInput,
} from 'src/core/entitis/coresa-sync-changes/CoresaSyncChangeTypes';

const DEFAULT_LIMIT = 50;

@Injectable()
export class CoresaSyncChangesService {
  constructor(
    @Inject('ISQLCoresaSyncChangesRepository')
    private readonly changesRepository: ISQLCoresaSyncChangesRepository,
  ) {}

  /**
   * runId y source son del lote; cada cambio puede traer su propio source y en
   * ese caso gana el del cambio.
   */
  async bulkInsert(
    body: BulkCoresaSyncChangesDTO,
  ): Promise<{ inserted: number }> {
    const batchSource = body.source ?? 'cron';
    const changes: CreateCoresaSyncChangeInput[] = body.changes.map(
      (change) => ({
        runId: body.runId ?? null,
        sku: change.sku.trim(),
        mla: change.mla.trim(),
        source: change.source ?? batchSource,
        result: change.result,
        priceBefore: change.priceBefore,
        priceRequested: change.priceRequested,
        priceApplied: change.priceApplied,
        stockBefore: change.stockBefore,
        stockRequested: change.stockRequested,
        stockApplied: change.stockApplied,
        meliStatus: change.meliStatus,
        meliSubStatus: change.meliSubStatus,
        errorCode: change.errorCode,
        errorMessage: change.errorMessage,
      }),
    );

    const empty = changes.findIndex((change) => !change.sku || !change.mla);

    if (empty !== -1) {
      throw new BadRequestException(
        `changes[${empty}]: sku and mla must not be empty`,
      );
    }

    const inserted = await this.changesRepository.bulkInsert(changes);

    return { inserted };
  }

  list(
    query: ListCoresaSyncChangesQueryDTO,
  ): Promise<CoresaSyncChangeListResult> {
    this.validateRange(query.from, query.to);

    return this.changesRepository.list({
      filters: {
        sku: query.sku?.trim() || undefined,
        mla: query.mla?.trim() || undefined,
        result: query.result,
        runId: query.runId,
        from: query.from,
        to: query.to,
      },
      limit: query.limit ?? DEFAULT_LIMIT,
      offset: query.offset ?? 0,
    });
  }

  listBySku(
    sku: string,
    query: ListCoresaSyncChangesQueryDTO,
  ): Promise<CoresaSyncChangeListResult> {
    this.validateRange(query.from, query.to);

    return this.changesRepository.list({
      filters: {
        sku,
        mla: query.mla?.trim() || undefined,
        result: query.result,
        runId: query.runId,
        from: query.from,
        to: query.to,
      },
      limit: query.limit ?? DEFAULT_LIMIT,
      offset: query.offset ?? 0,
    });
  }

  getStats(
    query: CoresaSyncChangeStatsQueryDTO,
  ): Promise<CoresaSyncChangeStatsResult> {
    this.validateRange(query.from, query.to);

    return this.changesRepository.getStats({
      from: query.from,
      to: query.to,
    });
  }

  private validateRange(from?: string, to?: string): void {
    if (from && to && from > to) {
      throw new BadRequestException('from must be earlier than or equal to to');
    }
  }
}
