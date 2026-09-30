/**
 * Red contra el dedazo: un 5 escrito donde va 0.05 multiplicaria por dos el
 * precio de todo lo que se publique despues. Tambien es lo que rechaza un 21.6
 * escrito en lugar de 0.216.
 */
export const MIN_FINANCING_COST = 0;
export const MAX_FINANCING_COST = 0.5;

/** Minusculas, digitos y guion bajo. Sin espacios ni acentos. */
export const MODALIDAD_PATTERN = /^[a-z0-9_]{1,40}$/;

export type MeliFinancingCostRow = {
  modalidad: string;
  etiqueta: string;
  costo: string | number;
  activa: number;
  vigente_desde: string | null;
  actualizado_por: string | null;
  updated_at: Date | string | null;
};

export type MeliFinancingCostDTO = {
  modalidad: string;
  etiqueta: string;
  /** Fraccion, no porcentaje: 21,6% viaja como 0.216. Siempre numero. */
  costo: number;
  activa: boolean;
  vigenteDesde: string | null;
  actualizadoPor: string | null;
  updatedAt: string | null;
};

export type CreateMeliFinancingCostInput = {
  modalidad: string;
  etiqueta: string;
  costo: number;
  actualizadoPor?: string | null;
};

/** Solo las claves presentes se escriben. */
export type UpdateMeliFinancingCostInput = {
  etiqueta?: string;
  costo?: number;
  activa?: boolean;
  actualizadoPor?: string | null;
};

export type MeliFinancingCostListResult = {
  items: MeliFinancingCostDTO[];
};
