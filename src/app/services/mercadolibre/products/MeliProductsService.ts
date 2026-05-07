import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ISQLMeliProductsRepository } from 'src/core/adapters/mercadolibre/products/ISQLMeliProductsRepository';
import type { ISQLMeliProductDeltasRepository } from 'src/core/adapters/mercadolibre/products/ISQLMeliProductDeltasRepository';
import {
  MeliProductDeltaCursorRow,
  MeliProductDeltaRow,
  ProductDeltaCursorResult,
  ProductDeltaFilters,
} from 'src/core/entitis/mercadolibre/products/MeliProductDeltaRow';
import { MeliProductRow } from 'src/core/entitis/mercadolibre/products/MeliProductRow';
import {
  MeliProductDTO,
  PaginatedResult,
  PaginationOptions,
} from 'src/core/entitis/mercadolibre/products/dto/MeliProductDTO';

const EDITABLE_PRODUCT_FIELDS = new Set<string>([
  'seller_id',
  'sku',
  'title',
  'description',
  'condition_type',
  'status',
  'permalink',
  'price',
  'base_price',
  'original_price',
  'available_quantity',
  'sold_quantity',
  'listing_type_id',
  'buying_mode',
  'catalog_listing',
  'category_id',
  'category_name',
  'category_path',
  'domain_id',
  'brand',
  'model',
  'gtin',
  'attributes',
  'thumbnail',
  'pictures',
  'video_id',
  'logistic_type',
  'shipping_mode',
  'free_shipping',
  'local_pick_up',
  'has_variations',
  'variations',
  'raw_payload',
  'last_webhook_at',
  'last_seen_at',
]);

@Injectable()
export class MeliProductsService {
  constructor(
    @Inject('ISQLMeliProductsRepository')
    private readonly productsRepository: ISQLMeliProductsRepository,
    @Inject('ISQLMeliProductDeltasRepository')
    private readonly productDeltasRepository: ISQLMeliProductDeltasRepository,
  ) {}

  async bulkUpsertProducts(
    products: MeliProductDTO[],
  ): Promise<{ count: number }> {
    if (!Array.isArray(products) || products.length === 0) {
      throw new BadRequestException('products must be a non-empty array');
    }

    products.forEach((product, index) => {
      if (!product?.meli_item_id || product.meli_item_id.trim() === '') {
        throw new BadRequestException(
          `products[${index}].meli_item_id is required`,
        );
      }
    });

    const count = await this.productsRepository.bulkUpsertProducts(products);

    return { count };
  }

  async updateProductField(
    meliItemId: string,
    field: string,
    value: unknown,
  ): Promise<void> {
    this.validateMeliItemId(meliItemId);
    this.validateEditableField(field);
    await this.ensureProductExists(meliItemId);
    await this.productsRepository.updateProductField(meliItemId, field, value);
  }

  async clearProductField(meliItemId: string, field: string): Promise<void> {
    this.validateMeliItemId(meliItemId);
    this.validateEditableField(field);
    await this.ensureProductExists(meliItemId);
    await this.productsRepository.clearProductField(meliItemId, field);
  }

  getProducts(
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<MeliProductRow>> {
    return this.productsRepository.getProducts(pagination);
  }

  async findProduct(identifier: string): Promise<MeliProductRow> {
    if (!identifier || identifier.trim() === '') {
      throw new BadRequestException('identifier is required');
    }

    const product = await this.productsRepository.findProduct(
      identifier.trim(),
    );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  getSkus(pagination: PaginationOptions): Promise<PaginatedResult<string>> {
    return this.productsRepository.getSkus(pagination);
  }

  getMlas(pagination: PaginationOptions): Promise<PaginatedResult<string>> {
    return this.productsRepository.getMlas(pagination);
  }

  getProductDeltas(
    pagination: PaginationOptions,
    filters: ProductDeltaFilters,
  ): Promise<PaginatedResult<MeliProductDeltaRow>> {
    return this.productDeltasRepository.getProductDeltas(pagination, filters);
  }

  getProductDeltasAfterId(
    lastDeltaId: number,
    limit: number,
  ): Promise<ProductDeltaCursorResult> {
    return this.productDeltasRepository.getProductDeltasAfterId(
      lastDeltaId,
      limit,
    );
  }

  async getProductDeltasForConsumer(
    consumer: string,
    limit: number,
  ): Promise<ProductDeltaCursorResult> {
    this.validateConsumer(consumer);

    const cursor = await this.productDeltasRepository.getDeltaCursor(consumer);
    const lastDeltaId = cursor?.last_delta_id ?? 0;
    const result = await this.productDeltasRepository.getProductDeltasAfterId(
      Number(lastDeltaId),
      limit,
    );

    return {
      ...result,
      consumer,
    };
  }

  getDeltaCursor(consumer: string): Promise<MeliProductDeltaCursorRow | null> {
    this.validateConsumer(consumer);
    return this.productDeltasRepository.getDeltaCursor(consumer);
  }

  saveDeltaCursor(
    consumer: string,
    lastDeltaId: number,
  ): Promise<MeliProductDeltaCursorRow> {
    this.validateConsumer(consumer);
    this.validateNonNegativeInteger(lastDeltaId, 'lastDeltaId');

    return this.productDeltasRepository.saveDeltaCursor(consumer, lastDeltaId);
  }

  parsePagination(page?: string, limit?: string): PaginationOptions {
    const parsedPage = Number(page ?? 1);
    const parsedLimit = Number(limit ?? 50);

    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      throw new BadRequestException('page must be an integer greater than 0');
    }

    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 500
    ) {
      throw new BadRequestException(
        'limit must be an integer between 1 and 500',
      );
    }

    return {
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  parseProcessedFilter(procesado?: string): ProductDeltaFilters {
    if (procesado === undefined) {
      return {};
    }

    if (procesado === '1' || procesado === 'true') {
      return { procesado: true };
    }

    if (procesado === '0' || procesado === 'false') {
      return { procesado: false };
    }

    throw new BadRequestException('procesado must be 0, 1, true or false');
  }

  parseLimit(limit?: string): number {
    const parsedLimit = Number(limit ?? 100);

    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 500
    ) {
      throw new BadRequestException(
        'limit must be an integer between 1 and 500',
      );
    }

    return parsedLimit;
  }

  parseNonNegativeInteger(value: string, label: string): number {
    const parsedValue = Number(value);

    this.validateNonNegativeInteger(parsedValue, label);

    return parsedValue;
  }

  private async ensureProductExists(meliItemId: string): Promise<void> {
    const product = await this.productsRepository.findProduct(meliItemId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }

  private validateMeliItemId(meliItemId: string): void {
    if (!meliItemId || meliItemId.trim() === '') {
      throw new BadRequestException('meliItemId is required');
    }
  }

  private validateEditableField(field: string): void {
    if (!field || !EDITABLE_PRODUCT_FIELDS.has(field)) {
      throw new BadRequestException(`Invalid editable product field: ${field}`);
    }
  }

  private validateConsumer(consumer: string): void {
    if (!consumer || consumer.trim() === '') {
      throw new BadRequestException('consumer is required');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(consumer)) {
      throw new BadRequestException(
        'consumer can only contain letters, numbers, underscores and hyphens',
      );
    }
  }

  private validateNonNegativeInteger(value: number, label: string): void {
    if (!Number.isInteger(value) || value < 0) {
      throw new BadRequestException(
        `${label} must be an integer greater than or equal to 0`,
      );
    }
  }
}
