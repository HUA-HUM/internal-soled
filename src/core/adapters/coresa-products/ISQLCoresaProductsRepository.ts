import {
  CoresaProductDTO,
  CoresaProductFilters,
  CoresaProductInput,
  CoresaProductListResult,
} from 'src/core/entitis/coresa-products/CoresaProductTypes';

export interface ISQLCoresaProductsRepository {
  /** Upsert por SKU. Devuelve cuantas filas escribio. */
  bulkUpsert(products: CoresaProductInput[]): Promise<number>;
  getBySku(sku: string): Promise<CoresaProductDTO | null>;
  getBySkus(skus: string[]): Promise<CoresaProductDTO[]>;
  list(params: {
    filters: CoresaProductFilters;
    limit: number;
    offset: number;
  }): Promise<CoresaProductListResult>;
}
