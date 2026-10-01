import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateMeliFinancingCostDTO,
  ListMeliFinancingCostsQueryDTO,
  UpdateMeliFinancingCostDTO,
} from 'src/app/controller/meli-financing-costs/internal/dto/MeliFinancingCostDTO';
import type { ISQLMeliFinancingCostsRepository } from 'src/core/adapters/meli-financing-costs/ISQLMeliFinancingCostsRepository';
import {
  MODALIDAD_PATTERN,
  MeliFinancingCostDTO,
  MeliFinancingCostListResult,
  UpdateMeliFinancingCostInput,
} from 'src/core/entitis/meli-financing-costs/MeliFinancingCostTypes';

@Injectable()
export class MeliFinancingCostsService {
  constructor(
    @Inject('ISQLMeliFinancingCostsRepository')
    private readonly costsRepository: ISQLMeliFinancingCostsRepository,
  ) {}

  list(
    query: ListMeliFinancingCostsQueryDTO,
  ): Promise<MeliFinancingCostListResult> {
    return this.costsRepository.list({
      activa: query.activa === undefined ? undefined : query.activa === 'true',
    });
  }

  async create(
    body: CreateMeliFinancingCostDTO,
  ): Promise<MeliFinancingCostDTO> {
    const modalidad = this.normalizeModalidad(body.modalidad);
    const existing = await this.costsRepository.getByModalidad(modalidad);

    // No se pisa por POST: para cambiar una que ya existe esta el PATCH.
    if (existing) {
      throw new ConflictException({
        code: 'modalidad_already_exists',
        item: existing,
      });
    }

    return this.costsRepository.create({
      modalidad,
      etiqueta: body.etiqueta.trim(),
      costo: body.costo,
      campaign: body.campaign ?? null,
      actualizadoPor: body.actualizadoPor?.trim() || null,
    });
  }

  async update(
    modalidad: string,
    body: UpdateMeliFinancingCostDTO,
  ): Promise<MeliFinancingCostDTO> {
    const input = this.toUpdateInput(body);

    if (!Object.keys(input).length) {
      throw new BadRequestException('Body must contain at least one field');
    }

    // No se crea por PATCH.
    const updated = await this.costsRepository.update(modalidad, input);

    if (!updated) {
      throw new NotFoundException(`Modalidad not found: ${modalidad}`);
    }

    return updated;
  }

  /**
   * Los espacios pasan a guion bajo, como pide el contrato, y se normaliza a
   * minusculas. Lo que quede afuera del patron (acentos, simbolos) se rechaza:
   * este string tiene que coincidir letra por letra con
   * coresa_products_in_mercadolibre.modalidad.
   */
  private normalizeModalidad(modalidad: string): string {
    const normalized = modalidad.trim().replace(/\s+/g, '_').toLowerCase();

    if (!MODALIDAD_PATTERN.test(normalized)) {
      throw new BadRequestException(
        'modalidad must be lowercase letters, digits or underscore, up to 40 characters',
      );
    }

    return normalized;
  }

  /** Copia solo las claves presentes: la ausente no se escribe. */
  private toUpdateInput(
    body: UpdateMeliFinancingCostDTO,
  ): UpdateMeliFinancingCostInput {
    const input: UpdateMeliFinancingCostInput = {};

    if (body.etiqueta !== undefined) {
      input.etiqueta = body.etiqueta.trim();
    }

    if (body.costo !== undefined) {
      input.costo = body.costo;
    }

    // Se compara contra undefined y no por truthiness: campaign en null es una
    // orden de borrar, no una ausencia.
    if (body.campaign !== undefined) {
      input.campaign = body.campaign;
    }

    if (body.activa !== undefined) {
      input.activa = body.activa;
    }

    if (body.actualizadoPor !== undefined) {
      input.actualizadoPor = body.actualizadoPor.trim() || null;
    }

    return input;
  }
}
