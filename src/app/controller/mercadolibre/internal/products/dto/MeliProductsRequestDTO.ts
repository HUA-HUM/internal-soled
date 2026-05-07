import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  products: MeliProductDTO[];
}

export class UpdateMeliProductFieldDTO {
  @ApiProperty({
    description: 'Campo de mercadolibre_products a modificar',
    example: 'price',
  })
  field: string;

  @ApiPropertyOptional({
    description: 'Nuevo valor del campo',
    example: 95000,
  })
  value: unknown;
}

export class SaveMeliProductDeltaCursorDTO {
  @ApiProperty({
    description:
      'Último id de mercadolibre_products_delta impactado correctamente',
    example: 1500,
  })
  last_delta_id: number;
}
