import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  MarketplaceChangeActionMarketplace,
  MarketplaceChangeActionStatus,
  MarketplaceChangeType,
} from 'src/core/entitis/marketplace-change-actions/MarketplaceChangeActionTypes';

const MARKETPLACES = ['oncity', 'fravega'] as const;
const CHANGE_TYPES = ['price', 'stock', 'status'] as const;
const STATUSES = [
  'queued',
  'processing',
  'completed',
  'failed',
  'skipped',
  'cancelled',
] as const;

export class CreateMarketplaceChangeActionDTO {
  @ApiProperty({ example: 'chg_1780000000000_abcd1234' })
  @IsString()
  actionId: string;

  @ApiProperty({
    example: 'mercadolibre_webhook:JDCDS520:oncity:price:70733',
  })
  @IsString()
  dedupeKey: string;

  @ApiProperty({ example: 'mercadolibre_webhook' })
  @IsString()
  source: string;

  @ApiProperty({ example: 'JDCDS520' })
  @IsString()
  sku: string;

  @ApiPropertyOptional({ example: 'MLA123456789' })
  @IsOptional()
  @IsString()
  meliItemId?: string;

  @ApiProperty({ example: 'oncity', enum: MARKETPLACES })
  @IsIn(MARKETPLACES)
  marketplace: MarketplaceChangeActionMarketplace;

  @ApiProperty({ example: 'price', enum: CHANGE_TYPES })
  @IsIn(CHANGE_TYPES)
  changeType: MarketplaceChangeType;

  @ApiPropertyOptional({ example: { price: 70000 } })
  @IsOptional()
  oldValue?: unknown;

  @ApiPropertyOptional({ example: { price: 70733 } })
  @IsOptional()
  newValue?: unknown;

  @ApiPropertyOptional({ example: 123 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  publicationId?: number;

  @ApiPropertyOptional({ example: '901' })
  @IsOptional()
  @IsString()
  externalProductId?: string;

  @ApiPropertyOptional({ example: '901' })
  @IsOptional()
  @IsString()
  externalSku?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  maxAttempts?: number;
}

export class BulkMarketplaceChangeActionsDTO {
  @ApiProperty({ type: [CreateMarketplaceChangeActionDTO] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateMarketplaceChangeActionDTO)
  actions: CreateMarketplaceChangeActionDTO[];
}

export class ListMarketplaceChangeActionsQueryDTO {
  @ApiPropertyOptional({ example: 'JDCDS520' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 'MLA123456789' })
  @IsOptional()
  @IsString()
  meliItemId?: string;

  @ApiPropertyOptional({ example: 'oncity', enum: MARKETPLACES })
  @IsOptional()
  @IsIn(MARKETPLACES)
  marketplace?: MarketplaceChangeActionMarketplace;

  @ApiPropertyOptional({ example: 'price', enum: CHANGE_TYPES })
  @IsOptional()
  @IsIn(CHANGE_TYPES)
  changeType?: MarketplaceChangeType;

  @ApiPropertyOptional({ example: 'queued', enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: MarketplaceChangeActionStatus;

  @ApiPropertyOptional({ example: 'mercadolibre_webhook' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: 50 })
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

export class MarketplaceChangeActionAnalyticsQueryDTO {
  @ApiPropertyOptional({
    example: '2026-08-19',
    description: 'Fecha calendario de la base de datos. Por defecto, hoy.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @ApiPropertyOptional({ example: 'fravega', enum: MARKETPLACES })
  @IsOptional()
  @IsIn(MARKETPLACES)
  marketplace?: MarketplaceChangeActionMarketplace;

  @ApiPropertyOptional({ example: 'completed', enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: MarketplaceChangeActionStatus;

  @ApiPropertyOptional({ example: 'mercadolibre_webhook' })
  @IsOptional()
  @IsString()
  source?: string;
}

export class MarkMarketplaceChangeActionProcessingDTO {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  attempts: number;

  @ApiPropertyOptional({ example: '123' })
  @IsOptional()
  @IsString()
  bullmqJobId?: string;
}

export class CompleteMarketplaceChangeActionDTO {
  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  requestSnapshot?: unknown;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  responseSnapshot?: unknown;
}

export class FailMarketplaceChangeActionDTO {
  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  attempts: number;

  @ApiProperty({ example: 'ONCITY_PRICE_UPDATE_FAILED' })
  @IsString()
  errorCode: string;

  @ApiProperty({ example: 'Request failed with status code 400' })
  @IsString()
  errorMessage: string;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  requestSnapshot?: unknown;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  responseSnapshot?: unknown;
}

export class SkipMarketplaceChangeActionDTO {
  @ApiProperty({ example: 'PUBLICATION_NOT_FOUND' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  responseSnapshot?: unknown;
}

export class UpdateMarketplaceChangeActionBullmqJobDTO {
  @ApiProperty({ example: '123' })
  @IsString()
  bullmqJobId: string;
}
