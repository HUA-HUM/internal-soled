/** 'gold_special' es la clasica, 'gold_pro' la premium. */
export type CoresaListingType = 'gold_special' | 'gold_pro';

/**
 * publicador  la creo coresa-api y los datos son ciertos
 * manual      la cargo una persona y la confirmo
 * heredado    fila vieja, datos desconocidos: el actualizador no la toca
 */
export type CoresaListingOrigen = 'publicador' | 'manual' | 'heredado';

export const CORESA_LISTING_TYPES: CoresaListingType[] = [
  'gold_special',
  'gold_pro',
];

export const CORESA_LISTING_ORIGENES: CoresaListingOrigen[] = [
  'publicador',
  'manual',
  'heredado',
];

/** Red contra el dedazo: un 100 escrito de mas multiplicaria el precio por 100. */
export const MIN_PRICE_FACTOR = 0.5;
export const MAX_PRICE_FACTOR = 3;

/** Las columnas se llaman igual que en el feed: SKU, MLA, updateStock... */
export type CoresaProductInMeliRow = {
  SKU: string;
  MLA: string;
  updateStock: number;
  updatePrice: number;
  listing_type: string | null;
  units_per_listing: number | null;
  modalidad: string | null;
  price_factor: string | number | null;
  origen: string;
  createdAt: Date | string;
  updated_at: Date | string | null;
};

/**
 * Los nombres son los que pide el contrato: camelCase en los flags que ya
 * existian, snake_case en los campos de variante, igual que las columnas.
 */
export type CoresaProductInMeliDTO = {
  sku: string;
  mla: string;
  updateStock: boolean;
  updatePrice: boolean;
  listing_type: string | null;
  units_per_listing: number | null;
  modalidad: string | null;
  price_factor: number;
  origen: string;
  createdAt: string | null;
  updatedAt: string | null;
};

/**
 * Campos opcionales del upsert. Una clave ausente NO se escribe: la columna
 * queda como estaba. Importa porque el panel manda solo sku, mla, updatePrice y
 * updateStock para prender y apagar filas, y eso no tiene que borrar la
 * variante ya cargada.
 */
export type CoresaProductInMeliVariantInput = {
  updateStock?: boolean;
  updatePrice?: boolean;
  listingType?: CoresaListingType;
  unitsPerListing?: number;
  modalidad?: string | null;
  priceFactor?: number;
  origen?: CoresaListingOrigen;
};

export type UpsertCoresaProductInMeliInput = {
  sku: string;
  mla: string;
} & CoresaProductInMeliVariantInput;

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

export type CoresaProductInMeliBySkuResult = {
  sku: string;
  items: CoresaProductInMeliDTO[];
};

export type CoresaProductInMeliBulkResult = {
  received: number;
  upserted: number;
  skipped: { index: number; reason: string }[];
};
