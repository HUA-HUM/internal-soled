import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import type { ISQLMeliFinancingCostsRepository } from 'src/core/adapters/meli-financing-costs/ISQLMeliFinancingCostsRepository';
import {
  CreateMeliFinancingCostInput,
  MeliFinancingCostDTO,
  MeliFinancingCostListResult,
  MeliFinancingCostRow,
  UpdateMeliFinancingCostInput,
} from 'src/core/entitis/meli-financing-costs/MeliFinancingCostTypes';
import { EntityManager } from 'typeorm';

/**
 * vigente_desde se formatea en SQL y no en JS: es un DATE y convertirlo a Date
 * en Node lo corre por la zona horaria del proceso.
 */
const SELECT_COLUMNS = `
  modalidad,
  etiqueta,
  costo,
  campaign,
  activa,
  DATE_FORMAT(vigente_desde, '%Y-%m-%d') AS vigente_desde,
  actualizado_por,
  updated_at
`;

@Injectable()
export class SQLMeliFinancingCostsRepository implements ISQLMeliFinancingCostsRepository {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async list(filters: {
    activa?: boolean;
  }): Promise<MeliFinancingCostListResult> {
    const whereSql = filters.activa === undefined ? '' : 'WHERE activa = ?';
    const queryParams =
      filters.activa === undefined ? [] : [filters.activa ? 1 : 0];
    const rows = await this.queryRows(
      `
      SELECT ${SELECT_COLUMNS}
      FROM meli_financing_costs
      ${whereSql}
      ORDER BY costo ASC, modalidad ASC
      `,
      queryParams,
    );

    return { items: rows.map((row) => this.toDTO(row)) };
  }

  async getByModalidad(
    modalidad: string,
  ): Promise<MeliFinancingCostDTO | null> {
    const rows = await this.queryRows(
      `
      SELECT ${SELECT_COLUMNS}
      FROM meli_financing_costs
      WHERE modalidad = ?
      LIMIT 1
      `,
      [modalidad],
    );

    return rows.length ? this.toDTO(rows[0]) : null;
  }

  async create(
    input: CreateMeliFinancingCostInput,
  ): Promise<MeliFinancingCostDTO> {
    await this.entityManager.query(
      `
      INSERT INTO meli_financing_costs
        (modalidad, etiqueta, costo, campaign, activa, vigente_desde, actualizado_por)
      VALUES (?, ?, ?, ?, 1, CURDATE(), ?)
      `,
      [
        input.modalidad,
        input.etiqueta,
        input.costo,
        input.campaign ?? null,
        input.actualizadoPor ?? null,
      ],
    );

    const created = await this.getByModalidad(input.modalidad);

    if (!created) {
      throw new Error(
        `[SQLMeliFinancingCostsRepository] Modalidad was not saved: ${input.modalidad}`,
      );
    }

    return created;
  }

  async update(
    modalidad: string,
    input: UpdateMeliFinancingCostInput,
  ): Promise<MeliFinancingCostDTO | null> {
    const current = await this.getByModalidad(modalidad);

    if (!current) {
      return null;
    }

    const costChanged =
      input.costo !== undefined && input.costo !== current.costo;
    const assignments: string[] = [];
    const queryParams: unknown[] = [];

    if (input.etiqueta !== undefined) {
      assignments.push('etiqueta = ?');
      queryParams.push(input.etiqueta);
    }

    if (input.costo !== undefined) {
      assignments.push('costo = ?');
      queryParams.push(input.costo);
    }

    // null explicito borra la campana; la clave ausente no la toca.
    if (input.campaign !== undefined) {
      assignments.push('campaign = ?');
      queryParams.push(input.campaign);
    }

    if (input.activa !== undefined) {
      assignments.push('activa = ?');
      queryParams.push(input.activa ? 1 : 0);
    }

    if (input.actualizadoPor !== undefined) {
      assignments.push('actualizado_por = ?');
      queryParams.push(input.actualizadoPor);
    }

    // El costo nuevo rige desde hoy; si no cambio, vigente_desde no se mueve.
    if (costChanged) {
      assignments.push('vigente_desde = CURDATE()');
    }

    if (assignments.length) {
      await this.entityManager.transaction(async (manager) => {
        if (costChanged && input.costo !== undefined) {
          await manager.query(
            `
            INSERT INTO meli_financing_costs_history
              (modalidad, costo_anterior, costo_nuevo, cambiado_por)
            VALUES (?, ?, ?, ?)
            `,
            [
              modalidad,
              current.costo,
              input.costo,
              input.actualizadoPor ?? current.actualizadoPor ?? null,
            ],
          );
        }

        await manager.query(
          `
          UPDATE meli_financing_costs
          SET ${assignments.join(', ')}
          WHERE modalidad = ?
          `,
          [...queryParams, modalidad],
        );
      });
    }

    return this.getByModalidad(modalidad);
  }

  private async queryRows(
    sql: string,
    params: unknown[],
  ): Promise<MeliFinancingCostRow[]> {
    const result: unknown = await this.entityManager.query(sql, params);

    return result as MeliFinancingCostRow[];
  }

  /** MySQL devuelve DECIMAL como string; el contrato pide numero. */
  private toDTO(row: MeliFinancingCostRow): MeliFinancingCostDTO {
    return {
      modalidad: row.modalidad,
      etiqueta: row.etiqueta,
      costo: Number(row.costo),
      campaign: row.campaign,
      activa: Number(row.activa) === 1,
      vigenteDesde: row.vigente_desde,
      actualizadoPor: row.actualizado_por,
      updatedAt: this.toIsoStringOrNull(row.updated_at),
    };
  }

  private toIsoStringOrNull(value: Date | string | null): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toISOString();
  }
}
