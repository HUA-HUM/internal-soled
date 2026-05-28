import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type {
  MarketplacePublicationStatus,
  MarketplacePublicationSyncStatus,
} from 'src/core/entitis/marketplace-publications/MarketplacePublicationTypes';

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
