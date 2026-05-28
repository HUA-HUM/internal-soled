import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { PublisherRunStatus } from 'src/core/entitis/publisher/PublisherTypes';

export class PublisherRequestedByDTO {
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  odooUserId?: number;

  @ApiPropertyOptional({ example: 'Administrator' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'admin@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreatePublisherJobDTO {
  @ApiPropertyOptional({ example: 'mercadolibre' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ example: ['RMS-2M-NEG', 'PC18CW'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  skus: string[];

  @ApiProperty({ example: ['oncity', 'fravega'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  marketplaces: string[];

  @ApiPropertyOptional({ type: PublisherRequestedByDTO })
  @IsOptional()
  @IsObject()
  requestedBy?: PublisherRequestedByDTO;

  @ApiPropertyOptional({
    example: {
      useAiEnrichment: true,
      publishMode: 'queue',
      forceRepublish: false,
    },
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'odoo_2_20260528_001' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class ListPublisherJobsQueryDTO {
  @ApiPropertyOptional({ example: 'processing' })
  @IsOptional()
  @IsString()
  status?: string;

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

export class ListPublisherRunsQueryDTO {
  @ApiPropertyOptional({ example: 'queued' })
  @IsOptional()
  @IsIn([
    'queued',
    'processing',
    'retrying',
    'completed',
    'failed',
    'skipped',
    'cancelled',
  ])
  status?: PublisherRunStatus;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class UpdatePublisherRunStatusDTO {
  @ApiProperty({ example: 'processing' })
  @IsIn([
    'queued',
    'processing',
    'retrying',
    'completed',
    'failed',
    'skipped',
    'cancelled',
  ])
  status: PublisherRunStatus;

  @ApiPropertyOptional({ example: 'Buscando producto base' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ example: '12345' })
  @IsOptional()
  @IsString()
  bullmqJobId?: string;

  @ApiPropertyOptional({ example: 'ONCITY_CREATE_FAILED' })
  @IsOptional()
  @IsString()
  errorCode?: string;

  @ApiPropertyOptional({ example: 'Bad Request: category required' })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({ example: { statusCode: 400 } })
  @IsOptional()
  responseSnapshot?: unknown;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  marketplacePublicationId?: number;

  @ApiPropertyOptional({ example: 'ONC123' })
  @IsOptional()
  @IsString()
  externalProductId?: string;
}

export class UpdatePublisherRunSnapshotsDTO {
  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  sourceProductSnapshot?: unknown;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  payloadSnapshot?: unknown;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  responseSnapshot?: unknown;
}
