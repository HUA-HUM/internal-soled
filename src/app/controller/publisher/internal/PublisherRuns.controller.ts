import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { InternalApiKeyGuard } from 'src/app/guards/internal-api-key.guard';
import { PublisherService } from 'src/app/services/publisher/PublisherService';
import {
  PublisherRunRow,
  PublisherRunStatus,
} from 'src/core/entitis/publisher/PublisherTypes';
import {
  ListPublisherRunsQueryDTO,
  UpdatePublisherRunSnapshotsDTO,
  UpdatePublisherRunStatusDTO,
} from './dto/PublisherDTO';

@ApiTags('Publisher - Internal Runs')
@ApiSecurity('internal-api-key')
@Controller('internal/publisher/runs')
@UseGuards(InternalApiKeyGuard)
export class PublisherRunsController {
  constructor(private readonly publisherService: PublisherService) {}

  @Get()
  @ApiOperation({ summary: 'Lista runs de publicación' })
  @ApiQuery({ name: 'status', required: false, example: 'queued' })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  listRuns(
    @Query() query: ListPublisherRunsQueryDTO,
  ): Promise<{ items: PublisherRunRow[] }> {
    return this.publisherService.listRuns(query);
  }

  @Get(':runId')
  @ApiOperation({ summary: 'Obtiene un run por ID' })
  @ApiParam({ name: 'runId', example: 'run_1780000000000_ab12cd34' })
  getRun(@Param('runId') runId: string): Promise<PublisherRunRow> {
    return this.publisherService.getRun(runId);
  }

  @Patch(':runId/status')
  @ApiOperation({ summary: 'Actualiza el estado de un run' })
  @ApiParam({ name: 'runId', example: 'run_1780000000000_ab12cd34' })
  @ApiBody({ type: UpdatePublisherRunStatusDTO })
  updateRunStatus(
    @Param('runId') runId: string,
    @Body() body: UpdatePublisherRunStatusDTO,
  ): Promise<{ ok: true; runId: string; status: PublisherRunStatus }> {
    return this.publisherService.updateRunStatus(runId, body);
  }

  @Patch(':runId/snapshots')
  @ApiOperation({ summary: 'Guarda snapshots de auditoría de un run' })
  @ApiParam({ name: 'runId', example: 'run_1780000000000_ab12cd34' })
  @ApiBody({ type: UpdatePublisherRunSnapshotsDTO })
  updateRunSnapshots(
    @Param('runId') runId: string,
    @Body() body: UpdatePublisherRunSnapshotsDTO,
  ): Promise<{ ok: true }> {
    return this.publisherService.updateRunSnapshots(runId, body);
  }

  @Post(':runId/retry')
  @ApiOperation({ summary: 'Reintenta manualmente un run' })
  @ApiParam({ name: 'runId', example: 'run_1780000000000_ab12cd34' })
  retryRun(
    @Param('runId') runId: string,
  ): Promise<{ ok: true; runId: string; status: PublisherRunStatus }> {
    return this.publisherService.retryRun(runId);
  }
}
