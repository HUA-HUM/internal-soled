import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsBooleanString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  MAX_FINANCING_COST,
  MIN_FINANCING_COST,
} from 'src/core/entitis/meli-financing-costs/MeliFinancingCostTypes';

const COSTO_DESCRIPTION =
  'Fracción, no porcentaje: 21,6% se manda como 0.216. Acotado entre 0 y 0.5, así un 21.6 escrito de más se rechaza.';

export class CreateMeliFinancingCostDTO {
  @ApiProperty({
    example: '18_cuotas',
    description:
      'Minúsculas, sin espacios ni acentos, hasta 40 caracteres. Los espacios se reemplazan por guion bajo antes de guardar. Es el mismo string que guarda coresa_products_in_mercadolibre.modalidad.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  modalidad: string;

  @ApiProperty({ example: '18 cuotas' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  etiqueta: string;

  @ApiProperty({ example: 0.28, description: COSTO_DESCRIPTION })
  @Type(() => Number)
  @IsNumber()
  @Min(MIN_FINANCING_COST)
  @Max(MAX_FINANCING_COST)
  costo: number;

  @ApiPropertyOptional({ example: 'arturo@solediluminacion.com' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  actualizadoPor?: string;
}

/** Todos opcionales: el campo que no viene no se pisa. */
export class UpdateMeliFinancingCostDTO {
  @ApiPropertyOptional({ example: '12 cuotas' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  etiqueta?: string;

  @ApiPropertyOptional({ example: 0.23, description: COSTO_DESCRIPTION })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(MIN_FINANCING_COST)
  @Max(MAX_FINANCING_COST)
  costo?: number;

  @ApiPropertyOptional({
    example: false,
    description:
      'false deja de ofrecer la modalidad sin borrarla: sigue existiendo para las publicaciones que ya la usan.',
  })
  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  @ApiPropertyOptional({ example: 'arturo@solediluminacion.com' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  actualizadoPor?: string;
}

export class ListMeliFinancingCostsQueryDTO {
  @ApiPropertyOptional({
    example: 'true',
    description: 'Sin este parámetro devuelve activas e inactivas.',
  })
  @IsOptional()
  @IsBooleanString()
  activa?: string;
}
