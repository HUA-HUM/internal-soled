import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { MeliProductsService } from 'src/app/services/mercadolibre/products/MeliProductsService';
import {
  MeliProductDeltaCursorRow,
  ProductDeltaCursorResult,
} from 'src/core/entitis/mercadolibre/products/MeliProductDeltaRow';
import { SaveMeliProductDeltaCursorDTO } from './dto/MeliProductsRequestDTO';

@ApiTags('Mercado Libre - Internal Product Delta Cursors')
@ApiSecurity('internal-api-key')
@Controller('internal/mercadolibre/products/deltas/cursors')
@UseGuards(InternalApiKeyGuard)
export class CursorController {
  constructor(private readonly productsService: MeliProductsService) {}

  @Get(':consumer')
  @ApiOperation({
    summary: 'Obtiene el cursor guardado de un consumidor',
  })
  @ApiParam({ name: 'consumer', example: 'oncity' })
  getDeltaCursor(
    @Param('consumer') consumer: string,
  ): Promise<MeliProductDeltaCursorRow | null> {
    return this.productsService.getDeltaCursor(consumer);
  }

  @Get(':consumer/next')
  @ApiOperation({
    summary: 'Obtiene los próximos cambios desde el cursor guardado',
    description:
      'Lee el último delta procesado para el consumer y devuelve registros con id mayor.',
  })
  @ApiParam({ name: 'consumer', example: 'oncity' })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  getNextProductDeltasForConsumer(
    @Param('consumer') consumer: string,
    @Query('limit') limit?: string,
  ): Promise<ProductDeltaCursorResult> {
    return this.productsService.getProductDeltasForConsumer(
      consumer,
      this.productsService.parseLimit(limit),
    );
  }

  @Patch(':consumer')
  @ApiOperation({
    summary: 'Guarda el último id de delta impactado por un consumidor',
  })
  @ApiParam({ name: 'consumer', example: 'oncity' })
  @ApiBody({ type: SaveMeliProductDeltaCursorDTO })
  saveDeltaCursor(
    @Param('consumer') consumer: string,
    @Body() body: SaveMeliProductDeltaCursorDTO,
  ): Promise<MeliProductDeltaCursorRow> {
    return this.productsService.saveDeltaCursor(consumer, body.last_delta_id);
  }
}
