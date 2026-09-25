import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BulkCoresaProductsInMeliDTO,
  CoresaProductsInMeliBySkuBulkDTO,
  ListCoresaProductsInMeliQueryDTO,
  UpdateCoresaProductInMeliDTO,
  UpsertCoresaProductInMeliDTO,
} from 'src/app/controller/coresa-products-in-mercadolibre/internal/dto/CoresaProductInMeliDTO';
import type { ISQLCoresaProductsInMeliRepository } from 'src/core/adapters/coresa-products-in-mercadolibre/ISQLCoresaProductsInMeliRepository';
import {
  CoresaProductInMeliBulkResult,
  CoresaProductInMeliDTO,
  CoresaProductInMeliListResult,
  UpsertCoresaProductInMeliInput,
} from 'src/core/entitis/coresa-products-in-mercadolibre/CoresaProductInMeliTypes';

const DEFAULT_LIMIT = 200;

@Injectable()
export class CoresaProductsInMeliService {
  constructor(
    @Inject('ISQLCoresaProductsInMeliRepository')
    private readonly repository: ISQLCoresaProductsInMeliRepository,
  ) {}

  upsert(body: UpsertCoresaProductInMeliDTO): Promise<CoresaProductInMeliDTO> {
    return this.repository.upsert({
      sku: body.sku.trim(),
      mla: body.mla.trim(),
      updateStock: body.updateStock,
      updatePrice: body.updatePrice,
    });
  }

  /**
   * Las filas invalidas se saltean y se informan, para que un item mal formado
   * no tumbe el lote entero.
   */
  async bulkUpsert(
    body: BulkCoresaProductsInMeliDTO,
  ): Promise<CoresaProductInMeliBulkResult> {
    const valid: UpsertCoresaProductInMeliInput[] = [];
    const skipped: { index: number; reason: string }[] = [];
    const seen = new Map<string, number>();

    body.items.forEach((item, index) => {
      const sku = item.sku?.trim();
      const mla = item.mla?.trim();

      if (!sku || !mla) {
        skipped.push({ index, reason: 'sku o mla vacio' });

        return;
      }

      const key = `${sku}|${mla}`;
      const previous = seen.get(key);
      const input: UpsertCoresaProductInMeliInput = {
        sku,
        mla,
        updateStock: item.updateStock,
        updatePrice: item.updatePrice,
      };

      // El mismo par repetido dentro de un INSERT rompe el ON DUPLICATE KEY
      // UPDATE, asi que gana el ultimo.
      if (previous !== undefined) {
        valid[previous] = input;

        return;
      }

      seen.set(key, valid.length);
      valid.push(input);
    });

    const upserted = await this.repository.bulkUpsert(valid);

    return { received: body.items.length, upserted, skipped };
  }

  getBySku(sku: string): Promise<CoresaProductInMeliDTO[]> {
    return this.repository.getBySku(sku);
  }

  async getBySkus(
    body: CoresaProductsInMeliBySkuBulkDTO,
  ): Promise<{ items: CoresaProductInMeliDTO[]; notFound: string[] }> {
    const skus = Array.from(
      new Set(body.skus.map((sku) => sku.trim()).filter(Boolean)),
    );

    if (!skus.length) {
      throw new BadRequestException('skus must contain at least one SKU');
    }

    const items = await this.repository.getBySkus(skus);
    const found = new Set(items.map((item) => item.sku));

    return { items, notFound: skus.filter((sku) => !found.has(sku)) };
  }

  async updateBySku(
    sku: string,
    body: UpdateCoresaProductInMeliDTO,
  ): Promise<{ items: CoresaProductInMeliDTO[]; updated: number }> {
    this.assertNotEmpty(body);

    const items = await this.repository.updateBySku(sku, body);

    if (!items.length) {
      throw new NotFoundException(`No publications found for sku ${sku}`);
    }

    return { items, updated: items.length };
  }

  async updateByMla(
    mla: string,
    body: UpdateCoresaProductInMeliDTO,
  ): Promise<CoresaProductInMeliDTO> {
    this.assertNotEmpty(body);

    const item = await this.repository.updateByMla(mla, body);

    if (!item) {
      throw new NotFoundException(`No publication found for mla ${mla}`);
    }

    return item;
  }

  list(
    query: ListCoresaProductsInMeliQueryDTO,
  ): Promise<CoresaProductInMeliListResult> {
    return this.repository.list({
      filters: {
        sku: query.sku?.trim() || undefined,
        mla: query.mla?.trim() || undefined,
        updateStock:
          query.updateStock === undefined
            ? undefined
            : query.updateStock === 'true',
        updatePrice:
          query.updatePrice === undefined
            ? undefined
            : query.updatePrice === 'true',
      },
      limit: query.limit ?? DEFAULT_LIMIT,
      offset: query.offset ?? 0,
    });
  }

  private assertNotEmpty(body: UpdateCoresaProductInMeliDTO): void {
    if (body.updateStock === undefined && body.updatePrice === undefined) {
      throw new BadRequestException(
        'Body must contain updateStock or updatePrice',
      );
    }
  }
}
