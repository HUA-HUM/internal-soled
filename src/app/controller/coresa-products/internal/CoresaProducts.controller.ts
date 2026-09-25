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
import { CoresaProductsService } from 'src/app/services/coresa-products/CoresaProductsService';
import {
  CoresaProductDTO,
  CoresaProductListResult,
  CoresaProductsBulkResult,
  CoresaProductsBySkuBulkResult,
} from 'src/core/entitis/coresa-products/CoresaProductTypes';
import {
  BulkCoresaProductsDTO,
  CoresaProductsBySkuBulkDTO,
  ListCoresaProductsQueryDTO,
} from './dto/CoresaProductDTO';

@ApiTags('Coresa Products - Internal')
@ApiSecurity('internal-api-key')
@Controller('internal/coresa/products')
@UseGuards(InternalApiKeyGuard)
export class CoresaProductsController {
  constructor(private readonly productsService: CoresaProductsService) {}

  @Post('bulk')
  @ApiOperation({
    summary: 'Upsert masivo del feed de productos de Coresa',
    description:
      'Una fila por SKU, que se sobreescribe entera. Acepta los nombres de campo tal cual los manda Coresa. Los productos sin SKU se saltean y se informan en skipped, sin tumbar el resto del lote. Si el mismo SKU viene repetido en el lote, gana el último.',
  })
  @ApiBody({ type: BulkCoresaProductsDTO })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        received: 4000,
        upserted: 3998,
        skipped: [{ index: 12, reason: 'SKU vacio o ausente' }],
      },
    },
  })
  bulkUpsert(
    @Body() body: BulkCoresaProductsDTO,
  ): Promise<CoresaProductsBulkResult> {
    return this.productsService.bulkUpsert(body);
  }

  @Post('by-sku/bulk')
  @ApiOperation({
    summary: 'Consulta varios SKUs de una vez',
    description:
      'Los SKUs van en el body y no en la query porque pueden traer espacios y barras (AEB 35 SC/1) y pueden ser muchos. Devuelve los encontrados y la lista de los que no están.',
  })
  @ApiBody({ type: CoresaProductsBySkuBulkDTO })
  getBySkus(
    @Body() body: CoresaProductsBySkuBulkDTO,
  ): Promise<CoresaProductsBySkuBulkResult> {
    return this.productsService.getBySkus(body);
  }

  @Get('by-sku/:sku')
  @ApiOperation({
    summary: 'Datos completos de un SKU',
    description:
      'Devuelve los 67 campos con los nombres de Coresa. 404 si el SKU no está. El sku viaja con encodeURIComponent porque puede traer espacios y barras.',
  })
  @ApiParam({ name: 'sku', example: '30005000106' })
  getBySku(@Param('sku') sku: string): Promise<CoresaProductDTO> {
    return this.productsService.getBySku(sku);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista productos de Coresa',
    description:
      'Paginada y filtrable. Sin limit usa 200; nunca devuelve la tabla completa.',
  })
  @ApiQuery({ name: 'sku', required: false, example: '30005000106' })
  @ApiQuery({ name: 'marca', required: false, example: 'DCK' })
  @ApiQuery({ name: 'macroFamilia', required: false, example: 'Iluminacion' })
  @ApiQuery({ name: 'subFamilia', required: false, example: 'Paneles' })
  @ApiQuery({ name: 'search', required: false, example: 'manija' })
  @ApiQuery({ name: 'disponible', required: false, example: 'true' })
  @ApiQuery({ name: 'limit', required: false, example: 200 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  list(
    @Query() query: ListCoresaProductsQueryDTO,
  ): Promise<CoresaProductListResult> {
    return this.productsService.list(query);
  }
}
