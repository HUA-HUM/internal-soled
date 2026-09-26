import {
  CoresaSyncChangeFilters,
  CoresaSyncChangeListResult,
  CoresaSyncChangeStatsResult,
  CreateCoresaSyncChangeInput,
} from 'src/core/entitis/coresa-sync-changes/CoresaSyncChangeTypes';

export interface ISQLCoresaSyncChangesRepository {
  /** Inserta todo el lote en una sola transaccion. Devuelve cuantas filas entraron. */
  bulkInsert(changes: CreateCoresaSyncChangeInput[]): Promise<number>;
  list(params: {
    filters: CoresaSyncChangeFilters;
    limit: number;
    offset: number;
  }): Promise<CoresaSyncChangeListResult>;
  /** Sin from/to usa los ultimos 7 dias segun la fecha de la base. */
  getStats(params: {
    from?: string;
    to?: string;
  }): Promise<CoresaSyncChangeStatsResult>;
}
