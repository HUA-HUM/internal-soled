import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBooleanString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Los productos se aceptan con los nombres de campo tal cual los manda Coresa
 * (SKU, CodBarra_Unitario, Precio_Lista_1...), sin validar campo por campo: los
 * 67 se normalizan por tipo al escribir y los desconocidos quedan en raw_json.
 * Asi un campo nuevo del feed no rompe la ingesta.
 */
export class BulkCoresaProductsDTO {
  @ApiProperty({
    description:
      'Productos tal cual llegan del feed de Coresa. Se upsertean por SKU. base_units dice a cuántas unidades corresponde Precio_Convertido (el empaque de Coresa); si no viene, la fila conserva el valor que tenía y una fila nueva arranca en 1.',
    example: [
      {
        SKU: '30005000106',
        CodBarra_Unitario: 'N',
        Descripcion: 'CONJUNTO DE MANIJA AUXILIAR',
        Marca: 'DCK',
        Disponible: 8,
        Unidad_Medida: 'Unidad',
        Minimo_Venta: false,
        Venta_Unitaria: true,
        Precio_Lista_1: 2,
        Precio_Convertido: 919209,
        base_units: 100,
        Impuestos: 'IVA_21',
        Moneda: 'USD',
        CantMinima: 1,
        Peso_kg: 0.1,
        URL_Imagen: 'https://s3.coresagroup.com/DCK/B2B/30005000106.png',
      },
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsObject({ each: true })
  products: Record<string, unknown>[];
}

export class CoresaProductsBySkuBulkDTO {
  @ApiProperty({
    description: 'SKUs a consultar.',
    example: ['30005000106', 'AEB 35 SC/1'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  skus: string[];
}

export class ListCoresaProductsQueryDTO {
  @ApiPropertyOptional({ example: '30005000106' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 'DCK' })
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiPropertyOptional({ example: 'Iluminacion' })
  @IsOptional()
  @IsString()
  macroFamilia?: string;

  @ApiPropertyOptional({ example: 'Paneles' })
  @IsOptional()
  @IsString()
  subFamilia?: string;

  @ApiPropertyOptional({
    example: 'manija',
    description: 'Búsqueda parcial sobre SKU, descripción y marca.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'true',
    description: 'true = solo con stock disponible; false = solo sin stock.',
  })
  @IsOptional()
  @IsBooleanString()
  disponible?: string;

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
