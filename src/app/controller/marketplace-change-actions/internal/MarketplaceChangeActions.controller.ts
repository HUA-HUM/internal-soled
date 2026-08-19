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
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { InternalApiKeyGuard } from 'src/app/guards/internal-api-key.guard';
import { MarketplaceChangeActionsService } from 'src/app/services/marketplace-change-actions/MarketplaceChangeActionsService';
import {
  MarketplaceChangeActionBulkItem,
  MarketplaceChangeActionAnalyticsResult,
  MarketplaceChangeActionDTO,
  MarketplaceChangeActionListResult,
} from 'src/core/entitis/marketplace-change-actions/MarketplaceChangeActionTypes';
import {
  BulkMarketplaceChangeActionsDTO,
  CompleteMarketplaceChangeActionDTO,
  FailMarketplaceChangeActionDTO,
  ListMarketplaceChangeActionsQueryDTO,
  MarketplaceChangeActionAnalyticsQueryDTO,
  MarkMarketplaceChangeActionProcessingDTO,
  SkipMarketplaceChangeActionDTO,
  UpdateMarketplaceChangeActionBullmqJobDTO,
} from './dto/MarketplaceChangeActionDTO';

@ApiTags('Marketplace Change Actions - Internal')
@ApiSecurity('internal-api-key')
@Controller('internal/marketplace-change-actions')
@UseGuards(InternalApiKeyGuard)
export class MarketplaceChangeActionsController {
  constructor(
    private readonly actionsService: MarketplaceChangeActionsService,
  ) {}

  @Post('bulk')
  @ApiOperation({
    summary: 'Crea acciones de cambio de marketplace en bulk',
    description: 'Idempotente por dedupe_key. No duplica acciones existentes.',
  })
  @ApiBody({ type: BulkMarketplaceChangeActionsDTO })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        items: [
          {
            id: 1,
            actionId: 'chg_1780000000000_abcd1234',
            dedupeKey: 'mercadolibre_webhook:JDCDS520:oncity:price:70733',
            status: 'queued',
            created: true,
          },
        ],
      },
    },
  })
  async bulkCreateOrGet(
    @Body() body: BulkMarketplaceChangeActionsDTO,
  ): Promise<{ items: MarketplaceChangeActionBulkItem[] }> {
    const items = await this.actionsService.bulkCreateOrGet(body);

    return { items };
  }

  @Get()
  @ApiOperation({ summary: 'Lista acciones de cambios marketplace' })
  @ApiQuery({ name: 'sku', required: false, example: 'JDCDS520' })
  @ApiQuery({ name: 'meliItemId', required: false, example: 'MLA123456789' })
  @ApiQuery({ name: 'marketplace', required: false, example: 'oncity' })
  @ApiQuery({ name: 'changeType', required: false, example: 'price' })
  @ApiQuery({ name: 'status', required: false, example: 'queued' })
  @ApiQuery({
    name: 'source',
    required: false,
    example: 'mercadolibre_webhook',
  })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  list(
    @Query() query: ListMarketplaceChangeActionsQueryDTO,
  ): Promise<MarketplaceChangeActionListResult> {
    return this.actionsService.list(query);
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Analítica diaria de acciones de cambios marketplace',
    description:
      'Devuelve totales, activaciones, cambios de precio/stock/estado, marcas, marketplaces, fuentes, horas, SKUs y errores. Usa la fecha de la base de datos cuando no se informa date.',
  })
  @ApiQuery({ name: 'date', required: false, example: '2026-08-19' })
  @ApiQuery({ name: 'marketplace', required: false, example: 'fravega' })
  @ApiQuery({ name: 'status', required: false, example: 'completed' })
  @ApiQuery({
    name: 'source',
    required: false,
    example: 'mercadolibre_webhook',
  })
  getAnalytics(
    @Query() query: MarketplaceChangeActionAnalyticsQueryDTO,
  ): Promise<MarketplaceChangeActionAnalyticsResult> {
    return this.actionsService.getAnalytics(query);
  }

  @Get(':actionId')
  @ApiOperation({ summary: 'Obtiene una acción por actionId' })
  @ApiParam({ name: 'actionId', example: 'chg_1780000000000_abcd1234' })
  getByActionId(
    @Param('actionId') actionId: string,
  ): Promise<MarketplaceChangeActionDTO> {
    return this.actionsService.getByActionId(actionId);
  }

  @Patch(':actionId/processing')
  @ApiOperation({ summary: 'Marca una acción como processing' })
  @ApiParam({ name: 'actionId', example: 'chg_1780000000000_abcd1234' })
  @ApiBody({ type: MarkMarketplaceChangeActionProcessingDTO })
  markProcessing(
    @Param('actionId') actionId: string,
    @Body() body: MarkMarketplaceChangeActionProcessingDTO,
  ): Promise<{ ok: true; actionId: string; status: 'processing' }> {
    return this.actionsService.markProcessing(actionId, body);
  }

  @Patch(':actionId/complete')
  @ApiOperation({ summary: 'Marca una acción como completed' })
  @ApiParam({ name: 'actionId', example: 'chg_1780000000000_abcd1234' })
  @ApiBody({ type: CompleteMarketplaceChangeActionDTO })
  complete(
    @Param('actionId') actionId: string,
    @Body() body: CompleteMarketplaceChangeActionDTO,
  ): Promise<{ ok: true; actionId: string; status: 'completed' }> {
    return this.actionsService.complete(actionId, body);
  }

  @Patch(':actionId/fail')
  @ApiOperation({ summary: 'Marca una acción como failed' })
  @ApiParam({ name: 'actionId', example: 'chg_1780000000000_abcd1234' })
  @ApiBody({ type: FailMarketplaceChangeActionDTO })
  fail(
    @Param('actionId') actionId: string,
    @Body() body: FailMarketplaceChangeActionDTO,
  ): Promise<{ ok: true; actionId: string; status: 'failed' }> {
    return this.actionsService.fail(actionId, body);
  }

  @Patch(':actionId/skip')
  @ApiOperation({ summary: 'Marca una acción como skipped' })
  @ApiParam({ name: 'actionId', example: 'chg_1780000000000_abcd1234' })
  @ApiBody({ type: SkipMarketplaceChangeActionDTO })
  skip(
    @Param('actionId') actionId: string,
    @Body() body: SkipMarketplaceChangeActionDTO,
  ): Promise<{ ok: true; actionId: string; status: 'skipped' }> {
    return this.actionsService.skip(actionId, body);
  }

  @Patch(':actionId/bullmq-job')
  @ApiOperation({ summary: 'Actualiza bullmq_job_id de una acción' })
  @ApiParam({ name: 'actionId', example: 'chg_1780000000000_abcd1234' })
  @ApiBody({ type: UpdateMarketplaceChangeActionBullmqJobDTO })
  updateBullmqJobId(
    @Param('actionId') actionId: string,
    @Body() body: UpdateMarketplaceChangeActionBullmqJobDTO,
  ): Promise<{ ok: true; actionId: string; bullmqJobId: string }> {
    return this.actionsService.updateBullmqJobId(actionId, body);
  }
}
