import {
  CoresaProductInMeliDTO,
  CoresaProductInMeliFilters,
  CoresaProductInMeliListResult,
  UpdateCoresaProductInMeliInput,
  UpsertCoresaProductInMeliInput,
} from 'src/core/entitis/coresa-products-in-mercadolibre/CoresaProductInMeliTypes';

export interface ISQLCoresaProductsInMeliRepository {
  /** Upsert por (sku, mla). Devuelve la fila resultante. */
  upsert(
    input: UpsertCoresaProductInMeliInput,
  ): Promise<CoresaProductInMeliDTO>;
  bulkUpsert(inputs: UpsertCoresaProductInMeliInput[]): Promise<number>;
  getBySku(sku: string): Promise<CoresaProductInMeliDTO[]>;
  getBySkus(skus: string[]): Promise<CoresaProductInMeliDTO[]>;
  getByMla(mla: string): Promise<CoresaProductInMeliDTO | null>;
  /** Actualiza todas las publicaciones del SKU. Devuelve las filas resultantes. */
  updateBySku(
    sku: string,
    input: UpdateCoresaProductInMeliInput,
  ): Promise<CoresaProductInMeliDTO[]>;
  updateByMla(
    mla: string,
    input: UpdateCoresaProductInMeliInput,
  ): Promise<CoresaProductInMeliDTO | null>;
  list(params: {
    filters: CoresaProductInMeliFilters;
    limit: number;
    offset: number;
  }): Promise<CoresaProductInMeliListResult>;
}
