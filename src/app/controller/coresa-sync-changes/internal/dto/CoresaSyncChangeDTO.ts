import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  CoresaSyncChangeResult,
  CoresaSyncChangeSource,
} from 'src/core/entitis/coresa-sync-changes/CoresaSyncChangeTypes';

const SOURCES = ['cron', 'manual'] as const;
const RESULTS = ['updated', 'not_applied', 'failed'] as const;
const MAX_CHANGES_PER_REQUEST = 1000;

export class CreateCoresaSyncChangeDTO {
  @ApiProperty({ example: 'PC12NW' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'MLA1234567890' })
  @IsString()
  @IsNotEmpty()
  mla: string;

  @ApiProperty({ example: 'updated', enum: RESULTS })
  @IsIn(RESULTS)
  result: CoresaSyncChangeResult;

  @ApiPropertyOptional({
    example: 'cron',
    enum: SOURCES,
    description: 'Si no viene, se usa el source del lote.',
  })
  @IsOptional()
  @IsIn(SOURCES)
  source?: CoresaSyncChangeSource;

  @ApiPropertyOptional({
    example: 5400,
    description:
      'Entero de pesos. NULL si esta actualización no tocaba precio.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priceBefore?: number;

  @ApiPropertyOptional({ example: 5600 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priceRequested?: number;

  @ApiPropertyOptional({ example: 5600 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priceApplied?: number;

  @ApiPropertyOptional({
    example: 120,
    description: 'NULL si esta actualización no tocaba stock.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  stockBefore?: number;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  stockRequested?: number;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  stockApplied?: number;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  meliStatus?: string;

  @ApiPropertyOptional({
    example: [],
    description: 'sub_status de ML tal cual viene. Se guarda como JSON.',
  })
  @IsOptional()
  meliSubStatus?: unknown;

  @ApiPropertyOptional({ example: 'item_not_found' })
  @IsOptional()
  @IsString()
  errorCode?: string;

  @ApiPropertyOptional({ example: 'Item not found' })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class BulkCoresaSyncChangesDTO {
  @ApiPropertyOptional({
    example: 812,
    description: 'process_runs.id de la corrida. Aplica a todo el lote.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  runId?: number;

  @ApiPropertyOptional({
    example: 'cron',
    enum: SOURCES,
    description: 'Source del lote. Por defecto cron.',
  })
  @IsOptional()
  @IsIn(SOURCES)
  source?: CoresaSyncChangeSource;

  @ApiProperty({
    type: [CreateCoresaSyncChangeDTO],
    description: `Array no vacío, máximo ${MAX_CHANGES_PER_REQUEST} cambios por request.`,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_CHANGES_PER_REQUEST)
  @ValidateNested({ each: true })
  @Type(() => CreateCoresaSyncChangeDTO)
  changes: CreateCoresaSyncChangeDTO[];
}

export class ListCoresaSyncChangesQueryDTO {
  @ApiPropertyOptional({ example: 'PC12NW' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 'MLA1234567890' })
  @IsOptional()
  @IsString()
  mla?: string;

  @ApiPropertyOptional({ example: 'updated', enum: RESULTS })
  @IsOptional()
  @IsIn(RESULTS)
  result?: CoresaSyncChangeResult;

  @ApiPropertyOptional({ example: 812 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  runId?: number;

  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'Desde, inclusive, sobre created_at.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({
    example: '2026-09-26',
    description: 'Hasta, inclusive, sobre created_at.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

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

export class CoresaSyncChangeStatsQueryDTO {
  @ApiPropertyOptional({
    example: '2026-09-20',
    description: 'Desde, inclusive. Por defecto, 7 días atrás.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({
    example: '2026-09-26',
    description: 'Hasta, inclusive. Por defecto, hoy en la base de datos.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
