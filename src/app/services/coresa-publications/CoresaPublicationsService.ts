import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateCoresaPublicationDTO,
  ListCoresaPublicationsQueryDTO,
  UpdateCoresaPublicationDTO,
} from 'src/app/controller/coresa-publications/internal/dto/CoresaPublicationDTO';
import type { ISQLCoresaPublicationsRepository } from 'src/core/adapters/coresa-publications/ISQLCoresaPublicationsRepository';
import {
  CoresaPublicationDTO,
  CoresaPublicationListResult,
  CoresaPublicationStatus,
  UpdateCoresaPublicationInput,
} from 'src/core/entitis/coresa-publications/CoresaPublicationTypes';

const DEFAULT_LIMIT = 50;

/**
 * Transiciones validas. Quien decide el estado es coresa-api; aca solo se valida
 * que el salto sea posible. published y discarded son terminales.
 */
const ALLOWED_TRANSITIONS: Record<
  CoresaPublicationStatus,
  CoresaPublicationStatus[]
> = {
  draft: ['draft', 'ready', 'discarded'],
  ready: ['draft', 'publishing', 'discarded'],
  publishing: ['published', 'partial', 'failed'],
  partial: ['publishing'],
  failed: ['publishing'],
  published: [],
  discarded: [],
};

const TERMINAL_STATUSES: CoresaPublicationStatus[] = ['published', 'discarded'];

/** Estados que exigen al menos un meli_item_id. */
const STATUSES_REQUIRING_ITEM_ID: CoresaPublicationStatus[] = [
  'published',
  'partial',
];

@Injectable()
export class CoresaPublicationsService {
  constructor(
    @Inject('ISQLCoresaPublicationsRepository')
    private readonly publicationsRepository: ISQLCoresaPublicationsRepository,
  ) {}

  async create(
    body: CreateCoresaPublicationDTO,
  ): Promise<CoresaPublicationDTO> {
    const sku = body.sku?.trim();

    if (!sku) {
      throw new BadRequestException('sku must be a non-empty string');
    }

    const open = await this.publicationsRepository.getOpenBySku(sku);

    if (open) {
      throw new ConflictException({
        code: 'publication_in_progress',
        publicationId: open.id,
      });
    }

    return this.publicationsRepository.create({
      sku,
      requestedBy: body.requestedBy,
      coresaSnapshot: body.coresaSnapshot,
      draft: body.draft,
      categoryId: body.categoryId,
      aiModel: body.aiModel,
      aiGeneratedAt: body.aiGeneratedAt,
    });
  }

  async update(
    id: number,
    body: UpdateCoresaPublicationDTO,
  ): Promise<CoresaPublicationDTO> {
    const input = this.toUpdateInput(body);

    if (!Object.keys(input).length) {
      throw new BadRequestException('Body must contain at least one field');
    }

    const current = await this.publicationsRepository.getById(id);

    if (!current) {
      throw new NotFoundException('Coresa publication not found');
    }

    if (input.status !== undefined) {
      this.assertTransition(current.status, input.status);
      this.assertItemIdPresent(current, input);

      if (
        STATUSES_REQUIRING_ITEM_ID.includes(input.status) &&
        input.publishedAt === undefined
      ) {
        input.publishedAt = new Date().toISOString();
      }
    }

    const publication = await this.publicationsRepository.update(id, input);

    if (!publication) {
      throw new NotFoundException('Coresa publication not found');
    }

    return publication;
  }

  async getById(id: number): Promise<CoresaPublicationDTO> {
    const publication = await this.publicationsRepository.getById(id);

    if (!publication) {
      throw new NotFoundException('Coresa publication not found');
    }

    return publication;
  }

  async getLatestBySku(sku: string): Promise<CoresaPublicationDTO> {
    const publication = await this.publicationsRepository.getLatestBySku(sku);

    if (!publication) {
      throw new NotFoundException(`No Coresa publication found for sku ${sku}`);
    }

    return publication;
  }

  getHistoryBySku(sku: string): Promise<CoresaPublicationDTO[]> {
    return this.publicationsRepository.getHistoryBySku(sku);
  }

  list(
    query: ListCoresaPublicationsQueryDTO,
  ): Promise<CoresaPublicationListResult> {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('from must be earlier than or equal to to');
    }

    return this.publicationsRepository.list({
      filters: {
        sku: query.sku?.trim() || undefined,
        status: query.status,
        categoryId: query.categoryId?.trim() || undefined,
        from: query.from,
        to: query.to,
      },
      limit: query.limit ?? DEFAULT_LIMIT,
      offset: query.offset ?? 0,
    });
  }

  private assertTransition(
    from: CoresaPublicationStatus,
    to: CoresaPublicationStatus,
  ): void {
    if (TERMINAL_STATUSES.includes(from)) {
      throw new ConflictException(
        `A publication in ${from} cannot change status anymore`,
      );
    }

    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
      throw new ConflictException(
        `Invalid status transition ${from} -> ${to}. Current status is ${from}`,
      );
    }
  }

  /**
   * published y partial exigen al menos un meli_item_id. Se mira el estado
   * resultante, no solo el body: un reintento de partial -> publishing ->
   * published puede traer solo el id que faltaba.
   */
  private assertItemIdPresent(
    current: CoresaPublicationDTO,
    input: UpdateCoresaPublicationInput,
  ): void {
    if (!input.status || !STATUSES_REQUIRING_ITEM_ID.includes(input.status)) {
      return;
    }

    const classicItemId =
      input.classicItemId === undefined
        ? current.classicItemId
        : input.classicItemId;
    const premiumItemId =
      input.premiumItemId === undefined
        ? current.premiumItemId
        : input.premiumItemId;

    if (!classicItemId && !premiumItemId) {
      throw new BadRequestException(
        `status ${input.status} requires at least one of classicItemId or premiumItemId`,
      );
    }
  }

  /** Copia solo las claves presentes en el body, conservando los null explicitos. */
  private toUpdateInput(
    body: UpdateCoresaPublicationDTO,
  ): UpdateCoresaPublicationInput {
    const input: UpdateCoresaPublicationInput = {};
    const keys: (keyof UpdateCoresaPublicationDTO)[] = [
      'status',
      'draft',
      'coresaSnapshot',
      'categoryId',
      'aiModel',
      'aiGeneratedAt',
      'validation',
      'classicItemId',
      'premiumItemId',
      'permalink',
      'response',
      'errorCode',
      'errorMessage',
      'publishedAt',
    ];

    for (const key of keys) {
      if (body[key] !== undefined) {
        Object.assign(input, { [key]: body[key] });
      }
    }

    return input;
  }
}
