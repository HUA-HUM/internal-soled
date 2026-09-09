import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type {
  MarketplacePublicationStatus,
  MarketplacePublicationSyncStatus,
} from 'src/core/entitis/marketplace-publications/MarketplacePublicationTypes';

const MARKETPLACES = ['oncity', 'fravega'] as const;
const PUBLICATION_STATUSES = [
  'draft',
  'pending_publish',
  'published',
  'paused',
  'rejected',
  'error',
  'out_of_sync',
  'deleted',
] as const;

export class ListMarketplacePublicationsQueryDTO {
  @ApiPropertyOptional({ example: 'JDCDS520' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 'oncity', enum: MARKETPLACES })
  @IsOptional()
  @IsIn(MARKETPLACES)
  marketplace?: string;

  @ApiPropertyOptional({ example: 'published', enum: PUBLICATION_STATUSES })
  @IsOptional()
  @IsIn(PUBLICATION_STATUSES)
  status?: MarketplacePublicationStatus;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class UpsertMarketplacePublicationDTO {
  @ApiPropertyOptional({ example: 'mercadolibre' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: 'MLA123456789' })
  @IsOptional()
  @IsString()
  meliItemId?: string;

  @ApiPropertyOptional({ example: 'ONC123' })
  @IsOptional()
  @IsString()
  externalProductId?: string;

  @ApiPropertyOptional({ example: 'RMS-2M-NEG' })
  @IsOptional()
  @IsString()
  externalSku?: string;

  @ApiPropertyOptional({ example: 'https://...' })
  @IsOptional()
  @IsString()
  externalUrl?: string;

  @ApiPropertyOptional({ example: 'published' })
  @IsOptional()
  @IsIn([
    'draft',
    'pending_publish',
    'published',
    'paused',
    'rejected',
    'error',
    'out_of_sync',
    'deleted',
  ])
  publicationStatus?: MarketplacePublicationStatus;

  @ApiPropertyOptional({ example: 'synced' })
  @IsOptional()
  @IsIn(['synced', 'pending', 'processing', 'failed'])
  syncStatus?: MarketplacePublicationSyncStatus;

  @ApiPropertyOptional({ example: 'Producto ejemplo' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Descripcion' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Marca' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'Modelo' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: '7791234567890' })
  @IsOptional()
  @IsString()
  gtin?: string;

  @ApiPropertyOptional({ example: '123' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Categoria' })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiPropertyOptional({ example: ['Categoria', 'Subcategoria'] })
  @IsOptional()
  categoryPath?: unknown;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  listPrice?: number;

  @ApiPropertyOptional({ example: 900 })
  @IsOptional()
  @IsNumber()
  salePrice?: number;

  @ApiPropertyOptional({ example: 744 })
  @IsOptional()
  @IsNumber()
  netPrice?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  discountPercentage?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  stock?: number;

  @ApiPropertyOptional({ example: 'ARS' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'https://...' })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional({ example: [] })
  @IsOptional()
  images?: unknown;

  @ApiPropertyOptional({ example: [] })
  @IsOptional()
  attributes?: unknown;

  @ApiPropertyOptional({ example: [] })
  @IsOptional()
  variations?: unknown;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  payload?: unknown;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  lastResponse?: unknown;

  @ApiPropertyOptional({ example: 'pub_1780000000000_ab12cd34' })
  @IsOptional()
  @IsString()
  lastJobId?: string;

  @ApiPropertyOptional({ example: 'run_1780000000000_ab12cd34' })
  @IsOptional()
  @IsString()
  lastRunId?: string;
}

export class MissingMarketplacePublicationsQueryDTO {
  @ApiPropertyOptional({ example: 50 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ example: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class MarketplacePublicationSkuStatusQueryDTO {
  @ApiPropertyOptional({ example: 'RMS-2M-NEG' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    example: 'plafon',
    description: 'Busqueda parcial por SKU, titulo o MLA.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'oncity,fravega,megatone',
    description:
      'Lista separada por coma. Si se omite, usa marketplaces base y existentes.',
  })
  @IsOptional()
  @IsString()
  marketplaces?: string;

  @ApiPropertyOptional({
    example: 'in_stock',
    description:
      'in_stock | con_stock | disponible | true para disponibles; out_of_stock | sin_stock | no_disponible | false para sin stock. Se evalua sobre el stock maximo entre las publicaciones del SKU.',
  })
  @IsOptional()
  @IsString()
  stock?: string;

  @ApiPropertyOptional({
    example: 'true',
    description:
      'true = SKUs con al menos una publicacion activa en Mercado Libre; false = SKUs sin ninguna activa.',
  })
  @IsOptional()
  @IsString()
  active?: string;

  @ApiPropertyOptional({
    example: 'active,paused',
    description:
      'Estados crudos de Mercado Libre separados por coma: active, paused, closed, inactive, under_review.',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    example: 'oncity',
    description:
      'Solo SKUs publicados en estos marketplaces (lista separada por coma).',
  })
  @IsOptional()
  @IsString()
  publishedIn?: string;

  @ApiPropertyOptional({
    example: 'fravega',
    description:
      'Solo SKUs NO publicados en estos marketplaces (lista separada por coma).',
  })
  @IsOptional()
  @IsString()
  notPublishedIn?: string;

  @ApiPropertyOptional({
    example: 'any',
    description:
      'any = publicado en al menos uno de publishedIn; all = publicado en todos.',
  })
  @IsOptional()
  @IsIn(['any', 'all'])
  publishedMatch?: 'any' | 'all';

  @ApiPropertyOptional({
    example: 'true',
    description:
      'Atajo: true = publicado en alguno de marketplaces; false = no publicado en ninguno.',
  })
  @IsOptional()
  @IsString()
  published?: string;

  @ApiPropertyOptional({
    example: 'Jadever',
    description: 'Marcas separadas por coma.',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    example: 'MLA1234',
    description: 'category_id o category_name, separados por coma.',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: 'cuotas',
    description:
      'clasica (gold_special) | cuotas (gold_pro / premium) | gratuita (free). Separados por coma. Matchea si el SKU tiene al menos una publicacion de ese tipo.',
  })
  @IsOptional()
  @IsString()
  listingType?: string;

  @ApiPropertyOptional({
    example: 'price',
    description: 'price | stock | title | sku | updated_at.',
  })
  @IsOptional()
  @IsIn(['price', 'stock', 'title', 'sku', 'updated_at'])
  sortBy?: string;

  @ApiPropertyOptional({ example: 'asc', description: 'asc | desc.' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: string;

  @ApiPropertyOptional({ example: 50 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ example: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class UpdateMarketplacePublicationStatusDTO {
  @ApiPropertyOptional({ example: 'error' })
  @IsOptional()
  @IsIn([
    'draft',
    'pending_publish',
    'published',
    'paused',
    'rejected',
    'error',
    'out_of_sync',
    'deleted',
  ])
  publicationStatus?: MarketplacePublicationStatus;

  @ApiPropertyOptional({ example: 'failed' })
  @IsOptional()
  @IsIn(['synced', 'pending', 'processing', 'failed'])
  syncStatus?: MarketplacePublicationSyncStatus;

  @ApiPropertyOptional({ example: 'Marketplace rejected product' })
  @IsOptional()
  @IsString()
  lastErrorMessage?: string;
}

export class UpdateMarketplacePublicationPriceDTO {
  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  listPrice?: number;

  @ApiPropertyOptional({ example: 900 })
  @IsOptional()
  @IsNumber()
  salePrice?: number;

  @ApiPropertyOptional({ example: 744 })
  @IsOptional()
  @IsNumber()
  netPrice?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  discountPercentage?: number;

  @ApiPropertyOptional({ example: 'ARS' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateMarketplacePublicationStockDTO {
  @ApiPropertyOptional({ example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;
}
