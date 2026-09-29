import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsBooleanString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CORESA_LISTING_ORIGENES,
  CORESA_LISTING_TYPES,
  MAX_PRICE_FACTOR,
  MIN_PRICE_FACTOR,
} from 'src/core/entitis/coresa-products-in-mercadolibre/CoresaProductInMeliTypes';
import type {
  CoresaListingOrigen,
  CoresaListingType,
} from 'src/core/entitis/coresa-products-in-mercadolibre/CoresaProductInMeliTypes';

/**
 * Los campos de variante llevan los nombres de las columnas (snake_case) y los
 * flags que ya existian siguen en camelCase, tal como define el contrato.
 *
 * Todos son opcionales y un campo ausente NO se escribe: el panel manda solo
 * sku, mla, updatePrice y updateStock, y eso no tiene que borrar la variante.
 */
export class UpsertCoresaProductInMeliDTO {
  @ApiProperty({ example: 'JDTM1501' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'MLA2095419285' })
  @IsString()
  @IsNotEmpty()
  mla: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  updateStock?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  updatePrice?: boolean;

  @ApiPropertyOptional({
    example: 'gold_special',
    enum: CORESA_LISTING_TYPES,
    description: 'gold_special es la clásica, gold_pro la premium.',
  })
  @IsOptional()
  @IsIn(CORESA_LISTING_TYPES)
  listing_type?: CoresaListingType;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Cuántas unidades del SKU vende ESA publicación. 1 para unidad suelta, 6 para un pack de 6.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  units_per_listing?: number;

  @ApiPropertyOptional({
    example: 'contado',
    description:
      'Etiqueta corta: contado, cuota_simple, x6, x12. null = contado.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  modalidad?: string;

  @ApiPropertyOptional({
    example: 1.0,
    minimum: MIN_PRICE_FACTOR,
    maximum: MAX_PRICE_FACTOR,
    description:
      'Recargo de la modalidad. 1 = sin recargo, 1.15 = 15% arriba. Acotado entre 0.5 y 3 como red contra el dedazo.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(MIN_PRICE_FACTOR)
  @Max(MAX_PRICE_FACTOR)
  price_factor?: number;

  @ApiPropertyOptional({
    example: 'publicador',
    enum: CORESA_LISTING_ORIGENES,
    description:
      'publicador = la creó coresa-api; manual = la confirmó una persona; heredado = fila vieja con datos desconocidos.',
  })
  @IsOptional()
  @IsIn(CORESA_LISTING_ORIGENES)
  origen?: CoresaListingOrigen;
}

export class BulkCoresaProductsInMeliDTO {
  @ApiProperty({ type: [UpsertCoresaProductInMeliDTO] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UpsertCoresaProductInMeliDTO)
  items: UpsertCoresaProductInMeliDTO[];
}

export class CoresaProductsInMeliBySkuBulkDTO {
  @ApiProperty({ example: ['JDTM1501', 'AEB 35 SC/1'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  skus: string[];
}

export class UpdateCoresaProductInMeliDTO {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  updateStock?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  updatePrice?: boolean;
}

export class ListCoresaProductsInMeliQueryDTO {
  @ApiPropertyOptional({ example: 'JDTM1501' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 'MLA2095419285' })
  @IsOptional()
  @IsString()
  mla?: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @IsBooleanString()
  updateStock?: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @IsBooleanString()
  updatePrice?: string;

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
