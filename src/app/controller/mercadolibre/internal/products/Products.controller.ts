import {
  Body,
  Controller,
  Delete,
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
import { MeliProductsService } from 'src/app/services/mercadolibre/products/MeliProductsService';
import { MeliProductRow } from 'src/core/entitis/mercadolibre/products/MeliProductRow';
import { PaginatedResult } from 'src/core/entitis/mercadolibre/products/dto/MeliProductDTO';
import {
  BulkMeliProductsDTO,
  UpdateMeliProductFieldDTO,
} from './dto/MeliProductsRequestDTO';

@ApiTags('Mercado Libre - Internal Products')
@ApiSecurity('internal-api-key')
@Controller('internal/mercadolibre/products')
@UseGuards(InternalApiKeyGuard)
export class ProductsController {
  constructor(private readonly productsService: MeliProductsService) {}

  @Post('bulk')
  @ApiOperation({
    summary: 'Inserta o actualiza productos de Mercado Libre en bulk',
    description:
      'Recibe una lista de publicaciones completas y las persiste en mercadolibre_products.',
  })
  @ApiBody({ type: BulkMeliProductsDTO })
  @ApiResponse({
    status: 201,
    description: 'Productos procesados correctamente',
    schema: { example: { status: 'ok', count: 10 } },
  })
  async bulkUpsertProducts(
    @Body() body: BulkMeliProductsDTO,
  ): Promise<{ status: 'ok'; count: number }> {
    const result = await this.productsService.bulkUpsertProducts(body.products);

    return { status: 'ok', count: result.count };
  }

  @Get()
  @ApiOperation({
    summary: 'Obtiene productos con paginado',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  getProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<MeliProductRow>> {
    return this.productsService.getProducts(
      this.productsService.parsePagination(page, limit),
    );
  }

  @Get('skus')
  @ApiOperation({
    summary: 'Obtiene solo SKUs con paginado',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  getSkus(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<string>> {
    return this.productsService.getSkus(
      this.productsService.parsePagination(page, limit),
    );
  }

  @Get('mlas')
  @ApiOperation({
    summary: 'Obtiene solo MLAs con paginado',
    description: 'Devuelve los valores de meli_item_id.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  getMlas(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<string>> {
    return this.productsService.getMlas(
      this.productsService.parsePagination(page, limit),
    );
  }

  @Get(':identifier')
  @ApiOperation({
    summary: 'Busca un producto por MLA o SKU',
  })
  @ApiParam({ name: 'identifier', example: 'MLA123456789' })
  findProduct(
    @Param('identifier') identifier: string,
  ): Promise<MeliProductRow> {
    return this.productsService.findProduct(identifier);
  }

  @Patch(':meliItemId/field')
  @ApiOperation({
    summary: 'Modifica un campo puntual de un producto',
  })
  @ApiParam({ name: 'meliItemId', example: 'MLA123456789' })
  @ApiBody({ type: UpdateMeliProductFieldDTO })
  @ApiResponse({
    status: 200,
    description: 'Campo actualizado correctamente',
    schema: { example: { status: 'ok' } },
  })
  async updateProductField(
    @Param('meliItemId') meliItemId: string,
    @Body() body: UpdateMeliProductFieldDTO,
  ): Promise<{ status: 'ok' }> {
    await this.productsService.updateProductField(
      meliItemId,
      body.field,
      body.value,
    );

    return { status: 'ok' };
  }

  @Delete(':meliItemId/field/:field')
  @ApiOperation({
    summary: 'Elimina un campo puntual de un producto',
    description: 'El campo se elimina lógicamente seteando su valor en NULL.',
  })
  @ApiParam({ name: 'meliItemId', example: 'MLA123456789' })
  @ApiParam({ name: 'field', example: 'video_id' })
  @ApiResponse({
    status: 200,
    description: 'Campo eliminado correctamente',
    schema: { example: { status: 'ok' } },
  })
  async clearProductField(
    @Param('meliItemId') meliItemId: string,
    @Param('field') field: string,
  ): Promise<{ status: 'ok' }> {
    await this.productsService.clearProductField(meliItemId, field);

    return { status: 'ok' };
  }
}
