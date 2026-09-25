import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BulkCoresaProductsDTO,
  CoresaProductsBySkuBulkDTO,
  ListCoresaProductsQueryDTO,
} from 'src/app/controller/coresa-products/internal/dto/CoresaProductDTO';
import type { ISQLCoresaProductsRepository } from 'src/core/adapters/coresa-products/ISQLCoresaProductsRepository';
import {
  CoresaProductDTO,
  CoresaProductInput,
  CoresaProductListResult,
  CoresaProductsBulkResult,
  CoresaProductsBySkuBulkResult,
} from 'src/core/entitis/coresa-products/CoresaProductTypes';

const DEFAULT_LIMIT = 200;
const MAX_SKU_LENGTH = 120;

@Injectable()
export class CoresaProductsService {
  constructor(
    @Inject('ISQLCoresaProductsRepository')
    private readonly productsRepository: ISQLCoresaProductsRepository,
  ) {}

  /**
   * Los productos sin SKU se saltean en vez de tumbar todo el lote: si Coresa
   * manda 4000 productos y 2 vienen mal, los otros 3998 tienen que entrar.
   */
  async bulkUpsert(
    body: BulkCoresaProductsDTO,
  ): Promise<CoresaProductsBulkResult> {
    const valid: CoresaProductInput[] = [];
    const skipped: { index: number; reason: string }[] = [];
    const seen = new Map<string, number>();

    body.products.forEach((product, index) => {
      const rawSku = product.SKU;
      const sku = typeof rawSku === 'string' ? rawSku.trim() : '';

      if (!sku) {
        skipped.push({ index, reason: 'SKU vacio o ausente' });

        return;
      }

      if (sku.length > MAX_SKU_LENGTH) {
        skipped.push({
          index,
          reason: `SKU de mas de ${MAX_SKU_LENGTH} caracteres`,
        });

        return;
      }

      const previous = seen.get(sku);

      if (previous !== undefined) {
        // Dos filas con el mismo SKU en un mismo INSERT rompen el
        // ON DUPLICATE KEY UPDATE, asi que gana la ultima.
        valid[previous] = { ...product, SKU: sku };

        return;
      }

      seen.set(sku, valid.length);
      valid.push({ ...product, SKU: sku });
    });

    const upserted = await this.productsRepository.bulkUpsert(valid);

    return {
      received: body.products.length,
      upserted,
      skipped,
    };
  }

  async getBySku(sku: string): Promise<CoresaProductDTO> {
    const product = await this.productsRepository.getBySku(sku);

    if (!product) {
      throw new NotFoundException(`No Coresa product found for sku ${sku}`);
    }

    return product;
  }

  async getBySkus(
    body: CoresaProductsBySkuBulkDTO,
  ): Promise<CoresaProductsBySkuBulkResult> {
    const skus = Array.from(
      new Set(body.skus.map((sku) => sku.trim()).filter(Boolean)),
    );

    if (!skus.length) {
      throw new BadRequestException('skus must contain at least one SKU');
    }

    const items = await this.productsRepository.getBySkus(skus);
    const found = new Set(items.map((item) => item.SKU));

    return {
      items,
      found: items.length,
      notFound: skus.filter((sku) => !found.has(sku)),
    };
  }

  list(query: ListCoresaProductsQueryDTO): Promise<CoresaProductListResult> {
    return this.productsRepository.list({
      filters: {
        sku: query.sku?.trim() || undefined,
        marca: query.marca?.trim() || undefined,
        macroFamilia: query.macroFamilia?.trim() || undefined,
        subFamilia: query.subFamilia?.trim() || undefined,
        search: query.search?.trim() || undefined,
        disponible:
          query.disponible === undefined
            ? undefined
            : query.disponible === 'true',
      },
      limit: query.limit ?? DEFAULT_LIMIT,
      offset: query.offset ?? 0,
    });
  }
}
