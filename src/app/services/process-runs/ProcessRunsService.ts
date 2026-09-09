import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateProcessRunDTO,
  FinishProcessRunDTO,
  ListProcessRunsQueryDTO,
  ProcessRunAnalyticsQueryDTO,
} from 'src/app/controller/process-runs/internal/dto/ProcessRunDTO';
import type { ISQLProcessRunsRepository } from 'src/core/adapters/process-runs/ISQLProcessRunsRepository';
import {
  ProcessRunAnalyticsResult,
  ProcessRunDTO,
  ProcessRunListResult,
} from 'src/core/entitis/process-runs/ProcessRunTypes';

const DEFAULT_LIMIT = 50;
const MAX_PROCESS_NAME_LENGTH = 120;

@Injectable()
export class ProcessRunsService {
  constructor(
    @Inject('ISQLProcessRunsRepository')
    private readonly processRunsRepository: ISQLProcessRunsRepository,
  ) {}

  create(body: CreateProcessRunDTO): Promise<ProcessRunDTO> {
    const processName = body.processName?.trim();

    if (!processName) {
      throw new BadRequestException('processName must be a non-empty string');
    }

    if (processName.length > MAX_PROCESS_NAME_LENGTH) {
      throw new BadRequestException(
        `processName must be at most ${MAX_PROCESS_NAME_LENGTH} characters`,
      );
    }

    return this.processRunsRepository.create({
      processName,
      triggerType: body.triggerType ?? 'cron',
    });
  }

  async finish(id: number, body: FinishProcessRunDTO): Promise<ProcessRunDTO> {
    const run = await this.processRunsRepository.finish(id, {
      status: body.status,
      summary: body.summary,
      errorMessage: body.errorMessage,
    });

    if (!run) {
      throw new NotFoundException('Process run not found');
    }

    return run;
  }

  list(query: ListProcessRunsQueryDTO): Promise<ProcessRunListResult> {
    this.validateRange(query.from, query.to);

    return this.processRunsRepository.list({
      filters: {
        processName: query.processName?.trim() || undefined,
        status: query.status,
        triggerType: query.triggerType,
        from: query.from,
        to: query.to,
      },
      limit: query.limit ?? DEFAULT_LIMIT,
      offset: query.offset ?? 0,
    });
  }

  getAnalytics(
    query: ProcessRunAnalyticsQueryDTO,
  ): Promise<ProcessRunAnalyticsResult> {
    this.validateRange(query.from, query.to);

    return this.processRunsRepository.getAnalytics({
      processName: query.processName?.trim() || undefined,
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
