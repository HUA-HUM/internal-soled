/** Las columnas se llaman igual que en el feed: SKU, MLA, updateStock... */
export type CoresaProductInMeliRow = {
  SKU: string;
  MLA: string;
  updateStock: number;
  updatePrice: number;
  createdAt: Date | string;
};

export type CoresaProductInMeliDTO = {
  sku: string;
  mla: string;
  updateStock: boolean;
  updatePrice: boolean;
  createdAt: string | null;
};

export type UpsertCoresaProductInMeliInput = {
  sku: string;
  mla: string;
  updateStock?: boolean;
  updatePrice?: boolean;
};

/** Solo las claves presentes se escriben. */
export type UpdateCoresaProductInMeliInput = {
  updateStock?: boolean;
  updatePrice?: boolean;
};

export type CoresaProductInMeliFilters = {
  sku?: string;
  skus?: string[];
  mla?: string;
  updateStock?: boolean;
  updatePrice?: boolean;
};

export type CoresaProductInMeliListResult = {
  items: CoresaProductInMeliDTO[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type CoresaProductInMeliBulkResult = {
  received: number;
  upserted: number;
  skipped: { index: number; reason: string }[];
};
