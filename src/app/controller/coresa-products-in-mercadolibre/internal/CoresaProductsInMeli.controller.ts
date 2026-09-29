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
import { CoresaProductsInMeliService } from 'src/app/services/coresa-products-in-mercadolibre/CoresaProductsInMeliService';
import {
  CoresaProductInMeliBulkResult,
  CoresaProductInMeliBySkuResult,
  CoresaProductInMeliDTO,
  CoresaProductInMeliListResult,
} from 'src/core/entitis/coresa-products-in-mercadolibre/CoresaProductInMeliTypes';
import {
  BulkCoresaProductsInMeliDTO,
  CoresaProductsInMeliBySkuBulkDTO,
  ListCoresaProductsInMeliQueryDTO,
  UpdateCoresaProductInMeliDTO,
  UpsertCoresaProductInMeliDTO,
} from './dto/CoresaProductInMeliDTO';

@ApiTags('Coresa Products in MercadoLibre - Internal')
@ApiSecurity('internal-api-key')
@Controller('internal/coresa/products-in-mercadolibre')
@UseGuards(InternalApiKeyGuard)
export class CoresaProductsInMeliController {
  constructor(private readonly service: CoresaProductsInMeliService) {}

  @Post()
  @ApiOperation({
    summary: 'Registra una publicación con su variante',
    description:
      'Upsert por MLA. Un campo que no viene en el body NO se pisa: el panel manda solo sku, mla, updatePrice y updateStock, y eso no borra la variante ya cargada. units_per_listing debe ser entero >= 1, listing_type gold_special o gold_pro, price_factor entre 0.5 y 3, origen publicador, manual o heredado.',
  })
  @ApiBody({ type: UpsertCoresaProductInMeliDTO })
  upsert(
    @Body() body: UpsertCoresaProductInMeliDTO,
  ): Promise<CoresaProductInMeliDTO> {
    return this.service.upsert(body);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Registra varias publicaciones de una vez',
    description:
      'Upsert por MLA, con las mismas reglas que el POST simple: lo que no viene no se pisa. Los items sin sku o sin mla se saltean y se informan en skipped. Si la misma MLA viene repetida, gana la última.',
  })
  @ApiBody({ type: BulkCoresaProductsInMeliDTO })
  bulkUpsert(
    @Body() body: BulkCoresaProductsInMeliDTO,
  ): Promise<CoresaProductInMeliBulkResult> {
    return this.service.bulkUpsert(body);
  }

  @Post('by-sku/bulk')
  @ApiOperation({
    summary: 'Consulta varios SKUs de una vez',
    description:
      'Los SKUs van en el body porque pueden traer espacios y barras y pueden ser muchos. Devuelve todas las publicaciones de esos SKUs y la lista de los que no tienen ninguna.',
  })
  @ApiBody({ type: CoresaProductsInMeliBySkuBulkDTO })
  getBySkus(
    @Body() body: CoresaProductsInMeliBySkuBulkDTO,
  ): Promise<{ items: CoresaProductInMeliDTO[]; notFound: string[] }> {
    return this.service.getBySkus(body);
  }

  @Get('by-sku/:sku')
  @ApiOperation({
    summary: 'Variantes publicadas de un SKU',
    description:
      'Todas las variantes ya publicadas del SKU, con su tipo, unidades y modalidad. El publicador la usa antes de publicar para no crear dos veces la misma variante. 200 con items vacío si el SKU no tiene ninguna, no 404.',
  })
  @ApiParam({ name: 'sku', example: 'JDTM1501' })
  getBySku(@Param('sku') sku: string): Promise<CoresaProductInMeliBySkuResult> {
    return this.service.getBySku(sku);
  }

  @Patch('by-sku/:sku')
  @ApiOperation({
    summary: 'Cambia los flags de todas las publicaciones de un SKU',
    description:
      'Afecta a todas las MLA de ese SKU. 400 si el body no trae updateStock ni updatePrice; 404 si el SKU no tiene publicaciones. Para tocar una sola, usar PATCH by-mla.',
  })
  @ApiParam({ name: 'sku', example: '30005000106' })
  @ApiBody({ type: UpdateCoresaProductInMeliDTO })
  updateBySku(
    @Param('sku') sku: string,
    @Body() body: UpdateCoresaProductInMeliDTO,
  ): Promise<{ items: CoresaProductInMeliDTO[]; updated: number }> {
    return this.service.updateBySku(sku, body);
  }

  @Patch('by-mla/:mla')
  @ApiOperation({
    summary: 'Cambia los flags de una publicación puntual',
    description: '404 si la MLA no está registrada.',
  })
  @ApiParam({ name: 'mla', example: 'MLA1234567890' })
  @ApiBody({ type: UpdateCoresaProductInMeliDTO })
  updateByMla(
    @Param('mla') mla: string,
    @Body() body: UpdateCoresaProductInMeliDTO,
  ): Promise<CoresaProductInMeliDTO> {
    return this.service.updateByMla(mla, body);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista las publicaciones registradas',
    description:
      'Paginada y filtrable. Sin limit usa 200; nunca devuelve la tabla completa.',
  })
  @ApiQuery({ name: 'sku', required: false, example: '30005000106' })
  @ApiQuery({ name: 'mla', required: false, example: 'MLA1234567890' })
  @ApiQuery({ name: 'updateStock', required: false, example: 'true' })
  @ApiQuery({ name: 'updatePrice', required: false, example: 'true' })
  @ApiQuery({ name: 'limit', required: false, example: 200 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  list(
    @Query() query: ListCoresaProductsInMeliQueryDTO,
  ): Promise<CoresaProductInMeliListResult> {
    return this.service.list(query);
  }
}
