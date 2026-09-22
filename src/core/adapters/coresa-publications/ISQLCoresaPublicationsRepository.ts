import {
  CoresaPublicationDTO,
  CoresaPublicationFilters,
  CoresaPublicationListResult,
  CreateCoresaPublicationInput,
  UpdateCoresaPublicationInput,
} from 'src/core/entitis/coresa-publications/CoresaPublicationTypes';

export interface ISQLCoresaPublicationsRepository {
  create(input: CreateCoresaPublicationInput): Promise<CoresaPublicationDTO>;
  update(
    id: number,
    input: UpdateCoresaPublicationInput,
  ): Promise<CoresaPublicationDTO | null>;
  getById(id: number): Promise<CoresaPublicationDTO | null>;
  getLatestBySku(sku: string): Promise<CoresaPublicationDTO | null>;
  getHistoryBySku(sku: string): Promise<CoresaPublicationDTO[]>;
  /** Fila abierta del SKU: draft, ready o publishing. Usada para la idempotencia del POST. */
  getOpenBySku(sku: string): Promise<CoresaPublicationDTO | null>;
  list(params: {
    filters: CoresaPublicationFilters;
    limit: number;
    offset: number;
  }): Promise<CoresaPublicationListResult>;
}
