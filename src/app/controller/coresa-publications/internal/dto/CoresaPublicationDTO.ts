import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import type { CoresaPublicationStatus } from 'src/core/entitis/coresa-publications/CoresaPublicationTypes';

const STATUSES = [
  'draft',
  'ready',
  'publishing',
  'published',
  'partial',
  'failed',
  'discarded',
] as const;

export class CreateCoresaPublicationDTO {
  @ApiProperty({ example: 'AEB 35 SC/1' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiPropertyOptional({ example: 'arturo@solediluminacion.com' })
  @IsOptional()
  @IsString()
  requestedBy?: string;

  @ApiPropertyOptional({
    example: { SKU: 'AEB 35 SC/1', Descripcion: '...', Precio_Lista_1: 1.78 },
    description: 'Producto de Coresa tal cual vino de su API, sin normalizar.',
  })
  @IsOptional()
  @IsObject()
  coresaSnapshot?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: {
      title: 'Ángulo De Fijación Lateral Weidmuller Aeb 35 Sc/1',
      categoryId: 'MLA1591',
      price: 5432,
      availableQuantity: 1050,
    },
    description: 'Borrador completo tal como se va a mandar a meli-api.',
  })
  @IsOptional()
  @IsObject()
  draft?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'MLA1591' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'gpt-4.1-mini' })
  @IsOptional()
  @IsString()
  aiModel?: string;

  @ApiPropertyOptional({ example: '2026-09-22T14:03:11.000Z' })
  @IsOptional()
  @IsDateString()
  aiGeneratedAt?: string;
}

export class UpdateCoresaPublicationDTO {
  @ApiPropertyOptional({ example: 'published', enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: CoresaPublicationStatus;

  @ApiPropertyOptional({ example: { title: '...' } })
  @IsOptional()
  @IsObject()
  draft?: Record<string, unknown>;

  @ApiPropertyOptional({ example: { SKU: 'AEB 35 SC/1' } })
  @IsOptional()
  @IsObject()
  coresaSnapshot?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'MLA1591' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'gpt-4.1-mini' })
  @IsOptional()
  @IsString()
  aiModel?: string;

  @ApiPropertyOptional({ example: '2026-09-22T14:03:11.000Z' })
  @IsOptional()
  @IsDateString()
  aiGeneratedAt?: string;

  @ApiPropertyOptional({
    example: { gold_special: { valid: true }, gold_pro: { valid: true } },
    description: 'Respuesta de POST /meli/items/validate.',
  })
  @IsOptional()
  @IsObject()
  validation?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'MLA1234567890' })
  @IsOptional()
  @IsString()
  classicItemId?: string | null;

  @ApiPropertyOptional({ example: 'MLA1234567891' })
  @IsOptional()
  @IsString()
  premiumItemId?: string | null;

  @ApiPropertyOptional({
    example: 'https://articulo.mercadolibre.com.ar/MLA-1234567890-...',
  })
  @IsOptional()
  @IsString()
  permalink?: string | null;

  @ApiPropertyOptional({ example: { results: { gold_special: { ok: true } } } })
  @IsOptional()
  @IsObject()
  response?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: null,
    description: 'Acepta null explícito para limpiarlo en un reintento.',
  })
  @IsOptional()
  @IsString()
  errorCode?: string | null;

  @ApiPropertyOptional({
    example: null,
    description: 'Acepta null explícito para limpiarlo en un reintento.',
  })
  @IsOptional()
  @IsString()
  errorMessage?: string | null;

  @ApiPropertyOptional({
    example: '2026-09-22T14:20:00.000Z',
    description:
      'Si no viene y el estado pasa a published o partial, se completa con NOW().',
  })
  @IsOptional()
  @IsDateString()
  publishedAt?: string | null;
}

export class ListCoresaPublicationsQueryDTO {
  @ApiPropertyOptional({ example: 'AEB 35 SC/1' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 'published', enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: CoresaPublicationStatus;

  @ApiPropertyOptional({ example: 'MLA1591' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'Desde, inclusive, sobre created_at.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({
    example: '2026-09-22',
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
