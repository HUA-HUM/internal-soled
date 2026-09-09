import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { InternalApiKeyGuard } from 'src/app/guards/internal-api-key.guard';
import { ProcessRunsService } from 'src/app/services/process-runs/ProcessRunsService';
import {
  ProcessRunAnalyticsResult,
  ProcessRunDTO,
  ProcessRunListResult,
} from 'src/core/entitis/process-runs/ProcessRunTypes';
import {
  CreateProcessRunDTO,
  FinishProcessRunDTO,
  ListProcessRunsQueryDTO,
  ProcessRunAnalyticsQueryDTO,
} from './dto/ProcessRunDTO';

@ApiTags('Process Runs - Internal')
@ApiSecurity('internal-api-key')
@Controller('internal/process-runs')
@UseGuards(InternalApiKeyGuard)
export class ProcessRunsController {
  constructor(private readonly processRunsService: ProcessRunsService) {}

  @Post()
  @ApiOperation({
    summary: 'Abre el registro de una corrida de proceso',
    description:
      'Se llama al arrancar el proceso. Deja la corrida en running con started_at = NOW().',
  })
  @ApiBody({ type: CreateProcessRunDTO })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        id: 123,
        processName: 'meli_reconciliation',
        triggerType: 'cron',
        status: 'running',
        startedAt: '2026-09-08T14:03:11.000Z',
      },
    },
  })
  create(@Body() body: CreateProcessRunDTO): Promise<ProcessRunDTO> {
    return this.processRunsService.create(body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Cierra el registro de una corrida de proceso',
    description:
      'Se llama al terminar, con completed o failed. El endpoint calcula finished_at y duration_ms contra started_at; el proceso no necesita medir el tiempo.',
  })
  @ApiParam({ name: 'id', example: 123 })
  @ApiBody({ type: FinishProcessRunDTO })
  finish(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: FinishProcessRunDTO,
  ): Promise<ProcessRunDTO> {
    return this.processRunsService.finish(id, body);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista corridas de procesos',
    description:
      'Paginado, filtrable por proceso, estado, tipo de disparo y rango de fechas sobre started_at.',
  })
  @ApiQuery({
    name: 'processName',
    required: false,
    example: 'meli_reconciliation',
  })
  @ApiQuery({ name: 'status', required: false, example: 'completed' })
  @ApiQuery({ name: 'triggerType', required: false, example: 'cron' })
  @ApiQuery({ name: 'from', required: false, example: '2026-09-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-09-08' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  list(@Query() query: ListProcessRunsQueryDTO): Promise<ProcessRunListResult> {
    return this.processRunsService.list(query);
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Analítica de corridas de procesos',
    description:
      'Totales por proceso, estado y tipo de disparo, duración promedio y corridas por día. Sin from/to usa los últimos 7 días de la base. Los promedios de duración se calculan solo sobre corridas completed.',
  })
  @ApiQuery({
    name: 'processName',
    required: false,
    example: 'meli_reconciliation',
  })
  @ApiQuery({ name: 'from', required: false, example: '2026-09-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-09-08' })
  getAnalytics(
    @Query() query: ProcessRunAnalyticsQueryDTO,
  ): Promise<ProcessRunAnalyticsResult> {
    return this.processRunsService.getAnalytics(query);
  }
}
