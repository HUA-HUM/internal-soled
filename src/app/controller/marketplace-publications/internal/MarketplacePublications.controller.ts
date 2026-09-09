import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
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
import { MarketplacePublicationsService } from 'src/app/services/marketplace-publications/MarketplacePublicationsService';
import {
  MarketplacePublicationListResult,
  MarketplacePublicationRow,
  MarketplacePublicationSkuStatusResult,
  MarketplaceSkuStatusFacetsResult,
  MissingMarketplacePublicationsResult,
} from 'src/core/entitis/marketplace-publications/MarketplacePublicationTypes';
import {
  ListMarketplacePublicationsQueryDTO,
  MarketplacePublicationSkuStatusQueryDTO,
  MissingMarketplacePublicationsQueryDTO,
  UpdateMarketplacePublicationPriceDTO,
  UpdateMarketplacePublicationStatusDTO,
  UpdateMarketplacePublicationStockDTO,
  UpsertMarketplacePublicationDTO,
} from './dto/MarketplacePublicationDTO';

@ApiTags('Marketplace Publications - Internal')
@ApiSecurity('internal-api-key')
@Controller('internal/marketplace-publications')
@UseGuards(InternalApiKeyGuard)
export class MarketplacePublicationsController {
  constructor(
    private readonly publicationsService: MarketplacePublicationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Busca publicaciones de marketplace',
    description:
      'Filtra por sku, marketplace y estado de publicación. Siempre paginado: sin limit usa 200, nunca devuelve la tabla completa.',
  })
  @ApiQuery({ name: 'sku', required: false, example: 'RMS-2M-NEG' })
  @ApiQuery({ name: 'marketplace', required: false, example: 'oncity' })
  @ApiQuery({ name: 'status', required: false, example: 'published' })
  @ApiQuery({ name: 'limit', required: false, example: 200 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  listPublications(
    @Query() query: ListMarketplacePublicationsQueryDTO,
  ): Promise<MarketplacePublicationListResult> {
    return this.publicationsService.listPublications(query);
  }

  @Get('missing/:marketplace')
  @ApiOperation({
    summary: 'Lista SKUs de Mercado Libre no publicados en un marketplace',
    description:
      'Cruza mercadolibre_products contra marketplace_product_publications por SKU.',
  })
  @ApiParam({ name: 'marketplace', example: 'oncity' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  listMissingPublications(
    @Param('marketplace') marketplace: string,
    @Query() query: MissingMarketplacePublicationsQueryDTO,
  ): Promise<MissingMarketplacePublicationsResult> {
    return this.publicationsService.listMissingPublications({
      marketplace,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get('status-by-sku')
  @ApiOperation({
    summary: 'Lista estado de publicación por SKU y marketplace',
    description:
      'Una fila por SKU. Un SKU puede tener varias publicaciones en Mercado Libre (clásica, premium y los escalones de cuotas): los campos agregados (publications, active_publications, price_min, price_max, stock) resumen todas, y los de display vienen de la publicación más barata entre las activas. Los filtros matchean si al menos una publicación del SKU cumple. Cruza contra marketplace_product_publications y devuelve un flag booleano por marketplace.',
  })
  @ApiQuery({ name: 'sku', required: false, example: 'RMS-2M-NEG' })
  @ApiQuery({ name: 'search', required: false, example: 'plafon' })
  @ApiQuery({
    name: 'marketplaces',
    required: false,
    example: 'oncity,fravega,megatone',
  })
  @ApiQuery({
    name: 'stock',
    required: false,
    example: 'in_stock',
    description: 'in_stock | out_of_stock (acepta con_stock / sin_stock).',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    example: 'true',
    description: 'true = activos en Mercado Libre; false = el resto.',
  })
  @ApiQuery({ name: 'status', required: false, example: 'active,paused' })
  @ApiQuery({ name: 'publishedIn', required: false, example: 'oncity' })
  @ApiQuery({ name: 'notPublishedIn', required: false, example: 'fravega' })
  @ApiQuery({ name: 'publishedMatch', required: false, example: 'any' })
  @ApiQuery({ name: 'published', required: false, example: 'true' })
  @ApiQuery({ name: 'brand', required: false, example: 'Jadever' })
  @ApiQuery({ name: 'category', required: false, example: 'MLA1234' })
  @ApiQuery({
    name: 'listingType',
    required: false,
    example: 'cuotas',
    description: 'clasica | cuotas | gratuita.',
  })
  @ApiQuery({ name: 'sortBy', required: false, example: 'price' })
  @ApiQuery({ name: 'sortDir', required: false, example: 'asc' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  listSkuPublicationStatus(
    @Query() query: MarketplacePublicationSkuStatusQueryDTO,
  ): Promise<MarketplacePublicationSkuStatusResult> {
    return this.publicationsService.listSkuPublicationStatus(query);
  }

  @Get('status-by-sku/filters')
  @ApiOperation({
    summary: 'Opciones disponibles para los filtros de status-by-sku',
    description:
      'Devuelve marcas, categorías, tipos de publicación, estados y rango de precios, cada uno con su cantidad de SKUs, para poblar los filtros del front.',
  })
  getSkuPublicationFacets(): Promise<MarketplaceSkuStatusFacetsResult> {
    return this.publicationsService.getSkuPublicationFacets();
  }

  @Get(':marketplace/:sku')
  @ApiOperation({ summary: 'Obtiene publicación por marketplace y SKU' })
  @ApiParam({ name: 'marketplace', example: 'oncity' })
  @ApiParam({ name: 'sku', example: 'RMS-2M-NEG' })
  getPublication(
    @Param('marketplace') marketplace: string,
    @Param('sku') sku: string,
  ): Promise<MarketplacePublicationRow> {
    return this.publicationsService.getPublication(marketplace, sku);
  }

  @Put(':marketplace/:sku')
  @ApiOperation({
    summary: 'Crea o actualiza publicación local de marketplace',
  })
  @ApiParam({ name: 'marketplace', example: 'oncity' })
  @ApiParam({ name: 'sku', example: 'RMS-2M-NEG' })
  @ApiBody({ type: UpsertMarketplacePublicationDTO })
  upsertPublication(
    @Param('marketplace') marketplace: string,
    @Param('sku') sku: string,
    @Body() body: UpsertMarketplacePublicationDTO,
  ): Promise<{ ok: true; id: number; sku: string; marketplace: string }> {
    return this.publicationsService.upsertPublication(marketplace, sku, body);
  }

  @Patch(':marketplace/:sku/status')
  @ApiOperation({ summary: 'Actualiza estado de publicación local' })
  @ApiParam({ name: 'marketplace', example: 'oncity' })
  @ApiParam({ name: 'sku', example: 'RMS-2M-NEG' })
  @ApiBody({ type: UpdateMarketplacePublicationStatusDTO })
  updateStatus(
    @Param('marketplace') marketplace: string,
    @Param('sku') sku: string,
    @Body() body: UpdateMarketplacePublicationStatusDTO,
  ): Promise<{ ok: true }> {
    return this.publicationsService.updateStatus(marketplace, sku, body);
  }

  @Patch(':marketplace/:sku/price')
  @ApiOperation({ summary: 'Actualiza precio local de publicación' })
  @ApiParam({ name: 'marketplace', example: 'oncity' })
  @ApiParam({ name: 'sku', example: 'RMS-2M-NEG' })
  @ApiBody({ type: UpdateMarketplacePublicationPriceDTO })
  updatePrice(
    @Param('marketplace') marketplace: string,
    @Param('sku') sku: string,
    @Body() body: UpdateMarketplacePublicationPriceDTO,
  ): Promise<{ ok: true }> {
    return this.publicationsService.updatePrice(marketplace, sku, body);
  }

  @Patch(':marketplace/:sku/stock')
  @ApiOperation({ summary: 'Actualiza stock local de publicación' })
  @ApiParam({ name: 'marketplace', example: 'oncity' })
  @ApiParam({ name: 'sku', example: 'RMS-2M-NEG' })
  @ApiBody({ type: UpdateMarketplacePublicationStockDTO })
  updateStock(
    @Param('marketplace') marketplace: string,
    @Param('sku') sku: string,
    @Body() body: UpdateMarketplacePublicationStockDTO,
  ): Promise<{ ok: true }> {
    return this.publicationsService.updateStock(marketplace, sku, body);
  }
}
