import { MeliProductRow } from 'src/core/entitis/mercadolibre/products/MeliProductRow';
import {
  MeliProductDTO,
  PaginatedResult,
  PaginationOptions,
} from 'src/core/entitis/mercadolibre/products/dto/MeliProductDTO';

export interface ISQLMeliProductsRepository {
  bulkUpsertProducts(products: MeliProductDTO[]): Promise<number>;
  updateProductField(
    meliItemId: string,
    field: string,
    value: unknown,
  ): Promise<void>;
  clearProductField(meliItemId: string, field: string): Promise<void>;
  getProducts(
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<MeliProductRow>>;
  findProduct(identifier: string): Promise<MeliProductRow | null>;
  getSkus(pagination: PaginationOptions): Promise<PaginatedResult<string>>;
  getMlas(pagination: PaginationOptions): Promise<PaginatedResult<string>>;
}
