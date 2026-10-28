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
  /** Borra la fila de esa MLA. Devuelve false si no existia. */
  deleteByMla(mla: string): Promise<boolean>;
  list(params: {
    filters: CoresaProductInMeliFilters;
    limit: number;
    offset: number;
  }): Promise<CoresaProductInMeliListResult>;
}
