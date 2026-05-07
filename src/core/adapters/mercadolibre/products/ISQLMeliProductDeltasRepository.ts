import {
  MeliProductDeltaCursorRow,
  MeliProductDeltaRow,
  ProductDeltaCursorResult,
  ProductDeltaFilters,
} from 'src/core/entitis/mercadolibre/products/MeliProductDeltaRow';
import {
  PaginatedResult,
  PaginationOptions,
} from 'src/core/entitis/mercadolibre/products/dto/MeliProductDTO';

export interface ISQLMeliProductDeltasRepository {
  getProductDeltas(
    pagination: PaginationOptions,
    filters: ProductDeltaFilters,
  ): Promise<PaginatedResult<MeliProductDeltaRow>>;
  getProductDeltasAfterId(
    lastDeltaId: number,
    limit: number,
  ): Promise<ProductDeltaCursorResult>;
  getDeltaCursor(consumer: string): Promise<MeliProductDeltaCursorRow | null>;
  saveDeltaCursor(
    consumer: string,
    lastDeltaId: number,
  ): Promise<MeliProductDeltaCursorRow>;
}
