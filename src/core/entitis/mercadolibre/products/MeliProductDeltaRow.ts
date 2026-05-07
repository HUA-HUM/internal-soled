export type MeliProductDeltaRow = {
  id: number;
  producto_id: number;
  meli_item_id: string;
  sku: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  operacion: 'INSERT' | 'UPDATE' | 'DELETE';
  origen: string;
  lote_id: string | null;
  procesado: boolean | number;
  procesado_at: Date | string | null;
  error_message: string | null;
  hash_idem: string;
  created_at: Date | string;
};

export type ProductDeltaFilters = {
  procesado?: boolean;
};

export type MeliProductDeltaCursorRow = {
  id: number;
  consumer: string;
  last_delta_id: number;
  created_at: Date | string;
  updated_at: Date | string;
};

export type ProductDeltaCursorResult = {
  data: MeliProductDeltaRow[];
  consumer?: string;
  lastDeltaId: number;
  nextCursor: number;
  limit: number;
  hasMore: boolean;
};
