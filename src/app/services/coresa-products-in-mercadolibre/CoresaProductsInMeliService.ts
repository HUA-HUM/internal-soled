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
  CoresaProductInMeliBySkuResult,
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
    return this.repository.upsert(this.toUpsertInput(body));
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

      // El upsert es por MLA, asi que la MLA identifica la fila.
      const previous = seen.get(mla);
      const input = this.toUpsertInput(item);

      // La misma MLA repetida dentro de un INSERT rompe el ON DUPLICATE KEY
      // UPDATE, asi que gana la ultima.
      if (previous !== undefined) {
        valid[previous] = input;

        return;
      }

      seen.set(mla, valid.length);
      valid.push(input);
    });

    const upserted = await this.repository.bulkUpsert(valid);

    return { received: body.items.length, upserted, skipped };
  }

  /**
   * Todas las variantes ya publicadas del SKU. 200 con items vacio cuando no
   * hay ninguna: que un SKU no tenga publicaciones no es un error.
   */
  async getBySku(sku: string): Promise<CoresaProductInMeliBySkuResult> {
    const items = await this.repository.getBySku(sku);

    return { sku, items };
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

  /**
   * Copia solo las claves presentes: una clave ausente no llega al repositorio
   * y por lo tanto no se escribe. Los nombres del body son los de las columnas.
   */
  private toUpsertInput(
    body: UpsertCoresaProductInMeliDTO,
  ): UpsertCoresaProductInMeliInput {
    const input: UpsertCoresaProductInMeliInput = {
      sku: body.sku.trim(),
      mla: body.mla.trim(),
    };

    if (body.updateStock !== undefined) {
      input.updateStock = body.updateStock;
    }

    if (body.updatePrice !== undefined) {
      input.updatePrice = body.updatePrice;
    }

    if (body.listing_type !== undefined) {
      input.listingType = body.listing_type;
    }

    if (body.units_per_listing !== undefined) {
      input.unitsPerListing = body.units_per_listing;
    }

    if (body.modalidad !== undefined) {
      input.modalidad = body.modalidad;
    }

    if (body.price_factor !== undefined) {
      input.priceFactor = body.price_factor;
    }

    if (body.origen !== undefined) {
      input.origen = body.origen;
    }

    return input;
  }

  private assertNotEmpty(body: UpdateCoresaProductInMeliDTO): void {
    if (body.updateStock === undefined && body.updatePrice === undefined) {
      throw new BadRequestException(
        'Body must contain updateStock or updatePrice',
      );
    }
  }
}
