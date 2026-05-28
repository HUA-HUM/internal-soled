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
} from 'src/core/entitis/marketplace-publications/MarketplacePublicationTypes';
import {
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
  @ApiOperation({ summary: 'Busca publicaciones de marketplace' })
  @ApiQuery({ name: 'sku', required: false, example: 'RMS-2M-NEG' })
  listPublications(
    @Query('sku') sku?: string,
  ): Promise<MarketplacePublicationListResult> {
    return this.publicationsService.listPublications({ sku });
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
