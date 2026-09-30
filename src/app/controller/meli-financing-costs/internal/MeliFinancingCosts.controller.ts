import {
  Body,
  Controller,
  Get,
  Param,
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
import { MeliFinancingCostsService } from 'src/app/services/meli-financing-costs/MeliFinancingCostsService';
import {
  MeliFinancingCostDTO,
  MeliFinancingCostListResult,
} from 'src/core/entitis/meli-financing-costs/MeliFinancingCostTypes';
import {
  CreateMeliFinancingCostDTO,
  ListMeliFinancingCostsQueryDTO,
  UpdateMeliFinancingCostDTO,
} from './dto/MeliFinancingCostDTO';

@ApiTags('MELI Financing Costs - Internal')
@ApiSecurity('internal-api-key')
@Controller('internal/meli/financing-costs')
@UseGuards(InternalApiKeyGuard)
export class MeliFinancingCostsController {
  constructor(private readonly costsService: MeliFinancingCostsService) {}

  @Get()
  @ApiOperation({
    summary: 'Costos de financiación de MercadoLibre',
    description:
      'Devuelve activas e inactivas. costo viaja como número y como fracción: 21,6% es 0.216. El coeficiente se calcula dividiendo por (1 - costo), y esa cuenta la hace coresa-api.',
  })
  @ApiQuery({ name: 'activa', required: false, example: 'true' })
  list(
    @Query() query: ListMeliFinancingCostsQueryDTO,
  ): Promise<MeliFinancingCostListResult> {
    return this.costsService.list(query);
  }

  @Post()
  @ApiOperation({
    summary: 'Crea una modalidad de financiación',
    description:
      'Para cuando ML saca una promo que hoy no existe, sin tocar código. vigente_desde y activa se completan solos: hoy y true. Si la modalidad ya existe responde 409 con la que existe; no se pisa por POST.',
  })
  @ApiBody({ type: CreateMeliFinancingCostDTO })
  @ApiResponse({ status: 409, description: 'La modalidad ya existe.' })
  create(
    @Body() body: CreateMeliFinancingCostDTO,
  ): Promise<MeliFinancingCostDTO> {
    return this.costsService.create(body);
  }

  @Patch(':modalidad')
  @ApiOperation({
    summary: 'Cambia el costo, la etiqueta o el estado de una modalidad',
    description:
      'Todos los campos son opcionales y el que no viene no se pisa. Si el costo cambia se escribe una fila en el historial y vigente_desde pasa a hoy; si llega el mismo costo, no se registra nada. activa false deja de ofrecerla sin borrarla. 404 si la modalidad no existe: no se crea por PATCH.',
  })
  @ApiParam({ name: 'modalidad', example: '12_cuotas' })
  @ApiBody({ type: UpdateMeliFinancingCostDTO })
  update(
    @Param('modalidad') modalidad: string,
    @Body() body: UpdateMeliFinancingCostDTO,
  ): Promise<MeliFinancingCostDTO> {
    return this.costsService.update(modalidad, body);
  }
}
