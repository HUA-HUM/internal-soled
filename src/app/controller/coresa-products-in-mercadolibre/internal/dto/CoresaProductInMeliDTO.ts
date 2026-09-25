import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsBooleanString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpsertCoresaProductInMeliDTO {
  @ApiProperty({ example: '30005000106' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'MLA1234567890' })
  @IsString()
  @IsNotEmpty()
  mla: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  updateStock?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  updatePrice?: boolean;
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
  @ApiProperty({ example: ['30005000106', 'AEB 35 SC/1'] })
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
  @ApiPropertyOptional({ example: '30005000106' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 'MLA1234567890' })
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
