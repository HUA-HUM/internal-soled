import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type { MeliProductDTO } from 'src/core/entitis/mercadolibre/products/dto/MeliProductDTO';

export class BulkMeliProductsDTO {
  @ApiProperty({
    description: 'Productos de Mercado Libre a insertar o actualizar',
    isArray: true,
    example: [
      {
        meli_item_id: 'MLA123456789',
        seller_id: '123456',
        sku: 'B0XXXX',
        title: 'Producto ejemplo',
        price: 95000,
        available_quantity: 12,
        status: 'active',
        raw_payload: {},
      },
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsObject({ each: true })
  products: MeliProductDTO[];
}

export class UpdateMeliProductFieldDTO {
  @ApiProperty({
    description: 'Campo de mercadolibre_products a modificar',
    example: 'price',
  })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiPropertyOptional({
    description: 'Nuevo valor del campo',
    example: 95000,
  })
  @IsOptional()
  value: unknown;
}

export class SaveMeliProductDeltaCursorDTO {
  @ApiProperty({
    description:
      'Último id de mercadolibre_products_delta impactado correctamente',
    example: 1500,
  })
  @IsInt()
  @Min(0)
  last_delta_id: number;
}
