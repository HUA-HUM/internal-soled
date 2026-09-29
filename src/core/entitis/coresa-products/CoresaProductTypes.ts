/**
 * Tipo de dato de cada campo del feed de Coresa, segun la columna real de
 * coresa_products. Define como se normaliza el valor antes de escribirlo.
 *
 * La API de Coresa manda "" para todo campo vacio, incluidos numericos y
 * booleanos, asi que "" siempre se guarda como NULL (o como el fallback, en las
 * columnas NOT NULL).
 */
export type CoresaFieldType = 'string' | 'int' | 'decimal' | 'bool';

export type CoresaProductField = {
  /**
   * Nombre del campo en el feed de Coresa. Es tambien el nombre exacto de la
   * columna: la tabla usa los nombres del feed sin traducir.
   */
  field: string;
  type: CoresaFieldType;
  /** Columna NOT NULL: si el feed manda vacio se escribe este valor. */
  notNullFallback?: number;
  /**
   * No viene del feed. El upsert lo preserva con COALESCE en vez de pisarlo
   * con NULL cuando el producto no lo trae.
   */
  preserveOnUpsert?: boolean;
  /**
   * Columna NOT NULL que tampoco hay que pisar: si el producto no la trae, se
   * la excluye del INSERT, asi la fila nueva toma el DEFAULT y la existente
   * conserva su valor. No sirve COALESCE porque un NOT NULL no admite el NULL
   * que haria de centinela.
   */
  skipWhenAbsent?: boolean;
};

/**
 * Las 69 columnas de coresa_products, en el orden del CREATE TABLE.
 *
 * Los campos de especificacion tecnica (IP, Lumenes, Potencia_Nominal,
 * Resolucion, Canales, Temp_Color...) son VARCHAR en la tabla: aunque en
 * algunos productos lleguen numericos, en otros traen "IP65", "3000K" o
 * "12/24V".
 */
export const CORESA_PRODUCT_FIELDS: CoresaProductField[] = [
  { field: 'SKU', type: 'string' },
  { field: 'CodBarra_Unitario', type: 'string' },
  { field: 'CodBarra_Intermedio', type: 'string' },
  { field: 'CodBarra_Master', type: 'string' },
  { field: 'Descripcion', type: 'string' },
  { field: 'Marca', type: 'string' },
  { field: 'Macro_Familia', type: 'string' },
  { field: 'Sub_Familia', type: 'string' },
  { field: 'Cod_Alternativo', type: 'string' },
  { field: 'Disponible', type: 'int', notNullFallback: 0 },
  { field: 'Unidad_Medida', type: 'string' },
  { field: 'Minimo_Venta', type: 'bool' },
  { field: 'Venta_Unitaria', type: 'bool' },
  { field: 'Precio_Lista_1', type: 'decimal', notNullFallback: 0 },
  { field: 'Impuestos', type: 'string' },
  { field: 'Moneda', type: 'string' },
  { field: 'CantMaster', type: 'decimal' },
  { field: 'CantIntermedia', type: 'decimal' },
  { field: 'CantMinima', type: 'decimal' },
  { field: 'Alto_cm', type: 'decimal' },
  { field: 'Ancho_cm', type: 'decimal' },
  { field: 'Largo_cm', type: 'decimal' },
  { field: 'Dimensiones_Texto', type: 'string' },
  { field: 'Peso_kg', type: 'decimal' },
  { field: 'Volumen_cc', type: 'decimal' },
  { field: 'Material', type: 'string' },
  { field: 'Color', type: 'string' },
  { field: 'Tipo_Montaje', type: 'string' },
  { field: 'Tipo_Instalacion', type: 'string' },
  { field: 'Soporte', type: 'string' },
  { field: 'IP', type: 'string' },
  { field: 'IK', type: 'string' },
  { field: 'Anti_Vandalico', type: 'string' },
  { field: 'Apto_Exterior', type: 'string' },
  { field: 'Alimentacion', type: 'string' },
  { field: 'Tension_Entrada', type: 'string' },
  { field: 'Tension_Salida', type: 'string' },
  { field: 'Potencia_Nominal', type: 'string' },
  { field: 'Potencia_Max', type: 'string' },
  { field: 'Corriente', type: 'string' },
  { field: 'Polos', type: 'string' },
  { field: 'Ciclos_Electricos', type: 'string' },
  { field: 'Ciclos_Mecanicos', type: 'string' },
  { field: 'Lumenes', type: 'string' },
  { field: 'Temp_Color', type: 'string' },
  { field: 'Angulo', type: 'string' },
  { field: 'Dimerizable', type: 'string' },
  { field: 'Tipo_Luz', type: 'string' },
  { field: 'Tipo_Camara', type: 'string' },
  { field: 'Tipo_Lente', type: 'string' },
  { field: 'Resolucion', type: 'string' },
  { field: 'Canales', type: 'string' },
  { field: 'Mic', type: 'string' },
  { field: 'Audio_Bidireccional', type: 'string' },
  { field: 'Reconocimiento_IA', type: 'string' },
  { field: 'Capacidad_Rostros', type: 'string' },
  { field: 'SATA', type: 'string' },
  { field: 'HDMI', type: 'string' },
  { field: 'Tipo_Conexion', type: 'string' },
  { field: 'Tipo_Conector', type: 'string' },
  { field: 'POE', type: 'string' },
  { field: 'Puertos_POE', type: 'string' },
  { field: 'Ancho_Banda', type: 'string' },
  { field: 'URL_Datasheet', type: 'string' },
  { field: 'URL_Web', type: 'string' },
  { field: 'URL_Imagen', type: 'string' },
  { field: 'Certificado', type: 'string' },
  { field: 'Precio_Convertido', type: 'int', preserveOnUpsert: true },
  { field: 'base_units', type: 'int', skipWhenAbsent: true },
];

/** El SKU es la PRIMARY KEY, no se sobreescribe en el upsert. */
export const CORESA_PRODUCT_UPDATABLE_FIELDS = CORESA_PRODUCT_FIELDS.filter(
  (field) => field.field !== 'SKU',
);

/**
 * Un producto tal cual llega del feed. Se acepta cualquier clave para no
 * romperse si Coresa agrega campos; las desconocidas se ignoran al escribir.
 */
export type CoresaProductInput = Record<string, unknown>;

/**
 * La respuesta usa los mismos nombres que la API de Coresa y que la tabla, para
 * que quien ya consume el feed lea esto sin traducir nada.
 */
export type CoresaProductDTO = Record<string, unknown> & {
  SKU: string;
};

export type CoresaProductFilters = {
  sku?: string;
  skus?: string[];
  marca?: string;
  macroFamilia?: string;
  subFamilia?: string;
  search?: string;
  /** true = solo con Disponible > 0; false = solo sin stock. */
  disponible?: boolean;
};

export type CoresaProductListResult = {
  items: CoresaProductDTO[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type CoresaProductsBulkResult = {
  received: number;
  upserted: number;
  skipped: { index: number; reason: string }[];
};

export type CoresaProductsBySkuBulkResult = {
  items: CoresaProductDTO[];
  found: number;
  notFound: string[];
};
