import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { InternalApiKeyGuard } from 'src/app/guards/internal-api-key.guard';
import { CoresaPublicationsService } from 'src/app/services/coresa-publications/CoresaPublicationsService';
import {
  CoresaPublicationDTO,
  CoresaPublicationListResult,
} from 'src/core/entitis/coresa-publications/CoresaPublicationTypes';
import {
  CreateCoresaPublicationDTO,
  ListCoresaPublicationsQueryDTO,
  UpdateCoresaPublicationDTO,
} from './dto/CoresaPublicationDTO';

@ApiTags('Coresa Publications - Internal')
@ApiSecurity('internal-api-key')
@Controller('internal/coresa/publications')
@UseGuards(InternalApiKeyGuard)
export class CoresaPublicationsController {
  constructor(
    private readonly publicationsService: CoresaPublicationsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Crea el borrador de publicación de un SKU de Coresa',
    description:
      'La fila nace en draft. Si el SKU ya tiene una fila en draft, ready o publishing responde 409 con { code: "publication_in_progress", publicationId }. Que published no bloquee es a propósito: republicar un SKU crea una fila nueva.',
  })
  @ApiBody({ type: CreateCoresaPublicationDTO })
  @ApiResponse({ status: 201, description: 'Publicación creada en draft.' })
  @ApiResponse({
    status: 409,
    description: 'El SKU ya tiene un intento abierto.',
  })
  create(
    @Body() body: CreateCoresaPublicationDTO,
  ): Promise<CoresaPublicationDTO> {
    return this.publicationsService.create(body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualiza borrador, estado y resultado',
    description:
      'Todos los campos son opcionales; se escribe solo lo que viene. Body vacío: 400. Transición inválida o fila terminal (published / discarded): 409. Pasar a published o partial exige al menos un item id y completa publishedAt con NOW() si no viene.',
  })
  @ApiParam({ name: 'id', example: 123 })
  @ApiBody({ type: UpdateCoresaPublicationDTO })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCoresaPublicationDTO,
  ): Promise<CoresaPublicationDTO> {
    return this.publicationsService.update(id, body);
  }

  @Get('by-sku/:sku/history')
  @ApiOperation({
    summary: 'Historial completo de un SKU',
    description:
      'Todas las filas del SKU, más nueva primero, sin paginar. Devuelve un array vacío si no hay ninguna.',
  })
  @ApiParam({ name: 'sku', example: 'AEB 35 SC/1' })
  getHistoryBySku(@Param('sku') sku: string): Promise<CoresaPublicationDTO[]> {
    return this.publicationsService.getHistoryBySku(sku);
  }

  @Get('by-sku/:sku')
  @ApiOperation({
    summary: 'Estado actual de un SKU',
    description:
      'La fila más reciente del SKU. 404 si no hay ninguna. El sku viaja con encodeURIComponent porque puede traer espacios y barras.',
  })
  @ApiParam({ name: 'sku', example: 'AEB 35 SC/1' })
  getLatestBySku(@Param('sku') sku: string): Promise<CoresaPublicationDTO> {
    return this.publicationsService.getLatestBySku(sku);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una publicación por id' })
  @ApiParam({ name: 'id', example: 123 })
  getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CoresaPublicationDTO> {
    return this.publicationsService.getById(id);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista publicaciones de Coresa',
    description:
      'Paginada y filtrable. Misma forma que GET /internal/process-runs.',
  })
  @ApiQuery({ name: 'sku', required: false, example: 'AEB 35 SC/1' })
  @ApiQuery({ name: 'status', required: false, example: 'published' })
  @ApiQuery({ name: 'categoryId', required: false, example: 'MLA1591' })
  @ApiQuery({ name: 'from', required: false, example: '2026-09-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-09-22' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  list(
    @Query() query: ListCoresaPublicationsQueryDTO,
  ): Promise<CoresaPublicationListResult> {
    return this.publicationsService.list(query);
  }
}
