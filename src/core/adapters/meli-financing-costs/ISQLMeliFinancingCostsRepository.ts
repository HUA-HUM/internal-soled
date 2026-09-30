import {
  CreateMeliFinancingCostInput,
  MeliFinancingCostDTO,
  MeliFinancingCostListResult,
  UpdateMeliFinancingCostInput,
} from 'src/core/entitis/meli-financing-costs/MeliFinancingCostTypes';

export interface ISQLMeliFinancingCostsRepository {
  list(filters: { activa?: boolean }): Promise<MeliFinancingCostListResult>;
  getByModalidad(modalidad: string): Promise<MeliFinancingCostDTO | null>;
  create(input: CreateMeliFinancingCostInput): Promise<MeliFinancingCostDTO>;
  /**
   * Escribe el historial y actualiza vigente_desde solo si el costo cambia, y
   * en la misma transaccion que el update.
   */
  update(
    modalidad: string,
    input: UpdateMeliFinancingCostInput,
  ): Promise<MeliFinancingCostDTO | null>;
}
