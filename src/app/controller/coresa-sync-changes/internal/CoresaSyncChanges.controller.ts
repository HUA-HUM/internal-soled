import {
  Body,
  Controller,
  Get,
  Param,
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
import { CoresaSyncChangesService } from 'src/app/services/coresa-sync-changes/CoresaSyncChangesService';
import {
  CoresaSyncChangeListResult,
  CoresaSyncChangeStatsResult,
} from 'src/core/entitis/coresa-sync-changes/CoresaSyncChangeTypes';
import {
  BulkCoresaSyncChangesDTO,
  CoresaSyncChangeStatsQueryDTO,
  ListCoresaSyncChangesQueryDTO,
} from './dto/CoresaSyncChangeDTO';

@ApiTags('Coresa MELI Sync Changes - Internal')
@ApiSecurity('internal-api-key')
@Controller('internal/coresa/meli-sync-changes')
@UseGuards(InternalApiKeyGuard)
export class CoresaSyncChangesController {
  constructor(private readonly changesService: CoresaSyncChangesService) {}

  @Post('bulk')
  @ApiOperation({
    summary: 'Registra los cambios de precio y stock de una corrida',
    description:
      'Una fila por actualización enviada a ML, no una por campo. Todo el lote entra en una sola transacción: si una fila falla no entra ninguna y el error dice qué índice fue. Máximo 1000 cambios por request.',
  })
  @ApiBody({ type: BulkCoresaSyncChangesDTO })
  @ApiResponse({ status: 201, schema: { example: { inserted: 2 } } })
  bulkInsert(
    @Body() body: BulkCoresaSyncChangesDTO,
  ): Promise<{ inserted: number }> {
    return this.changesService.bulkInsert(body);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Resumen de cambios para el panel',
    description:
      'Totales por resultado y desglose por día. Sin from/to usa los últimos 7 días según la fecha de la base.',
  })
  @ApiQuery({ name: 'from', required: false, example: '2026-09-20' })
  @ApiQuery({ name: 'to', required: false, example: '2026-09-26' })
  getStats(
    @Query() query: CoresaSyncChangeStatsQueryDTO,
  ): Promise<CoresaSyncChangeStatsResult> {
    return this.changesService.getStats(query);
  }

  @Get('by-sku/:sku')
  @ApiOperation({
    summary: 'Historial de precio y stock de un SKU',
    description:
      'Todos los cambios del SKU, más nuevo primero, paginado igual que el listado. El sku viaja con encodeURIComponent porque puede traer espacios y barras.',
  })
  @ApiParam({ name: 'sku', example: 'AEB 35 SC/1' })
  @ApiQuery({ name: 'mla', required: false, example: 'MLA1234567890' })
  @ApiQuery({ name: 'result', required: false, example: 'updated' })
  @ApiQuery({ name: 'runId', required: false, example: 812 })
  @ApiQuery({ name: 'from', required: false, example: '2026-09-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-09-26' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  listBySku(
    @Param('sku') sku: string,
    @Query() query: ListCoresaSyncChangesQueryDTO,
  ): Promise<CoresaSyncChangeListResult> {
    return this.changesService.listBySku(sku, query);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista los cambios registrados',
    description: 'Más nuevo primero, paginado y filtrable.',
  })
  @ApiQuery({ name: 'sku', required: false, example: 'PC12NW' })
  @ApiQuery({ name: 'mla', required: false, example: 'MLA1234567890' })
  @ApiQuery({ name: 'result', required: false, example: 'updated' })
  @ApiQuery({ name: 'runId', required: false, example: 812 })
  @ApiQuery({ name: 'from', required: false, example: '2026-09-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-09-26' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  list(
    @Query() query: ListCoresaSyncChangesQueryDTO,
  ): Promise<CoresaSyncChangeListResult> {
    return this.changesService.list(query);
  }
}
