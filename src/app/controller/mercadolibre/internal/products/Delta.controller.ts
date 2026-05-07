import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { InternalApiKeyGuard } from 'src/app/guards/internal-api-key.guard';
import { MeliProductsService } from 'src/app/services/mercadolibre/products/MeliProductsService';
import {
  MeliProductDeltaRow,
  ProductDeltaCursorResult,
} from 'src/core/entitis/mercadolibre/products/MeliProductDeltaRow';
import { PaginatedResult } from 'src/core/entitis/mercadolibre/products/dto/MeliProductDTO';

@ApiTags('Mercado Libre - Internal Product Deltas')
@ApiSecurity('internal-api-key')
@Controller('internal/mercadolibre/products/deltas')
@UseGuards(InternalApiKeyGuard)
export class DeltaController {
  constructor(private readonly productsService: MeliProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtiene cambios de productos con paginado',
    description:
      'Lee la cola/historial mercadolibre_products_delta generada por triggers.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  @ApiQuery({
    name: 'procesado',
    required: false,
    enum: ['0', '1', 'true', 'false'],
    example: '0',
  })
  getProductDeltas(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('procesado') procesado?: string,
  ): Promise<PaginatedResult<MeliProductDeltaRow>> {
    return this.productsService.getProductDeltas(
      this.productsService.parsePagination(page, limit),
      this.productsService.parseProcessedFilter(procesado),
    );
  }

  @Get('after/:lastDeltaId')
  @ApiOperation({
    summary: 'Obtiene cambios posteriores a un id de delta',
    description:
      'Devuelve registros con id mayor a lastDeltaId, ordenados por id ASC.',
  })
  @ApiParam({ name: 'lastDeltaId', example: 1500 })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  getProductDeltasAfterId(
    @Param('lastDeltaId') lastDeltaId: string,
    @Query('limit') limit?: string,
  ): Promise<ProductDeltaCursorResult> {
    return this.productsService.getProductDeltasAfterId(
      this.productsService.parseNonNegativeInteger(lastDeltaId, 'lastDeltaId'),
      this.productsService.parseLimit(limit),
    );
  }
}
