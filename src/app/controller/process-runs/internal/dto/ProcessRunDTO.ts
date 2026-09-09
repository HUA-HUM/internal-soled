import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import type {
  ProcessRunStatus,
  ProcessRunTriggerType,
} from 'src/core/entitis/process-runs/ProcessRunTypes';

const TRIGGER_TYPES = ['cron', 'manual'] as const;
const STATUSES = ['running', 'completed', 'failed'] as const;
const FINAL_STATUSES = ['completed', 'failed'] as const;

export class CreateProcessRunDTO {
  @ApiProperty({ example: 'meli_reconciliation' })
  @IsString()
  processName: string;

  @ApiPropertyOptional({ example: 'cron', enum: TRIGGER_TYPES })
  @IsOptional()
  @IsIn(TRIGGER_TYPES)
  triggerType?: ProcessRunTriggerType;
}

export class FinishProcessRunDTO {
  @ApiProperty({ example: 'completed', enum: FINAL_STATUSES })
  @IsIn(FINAL_STATUSES)
  status: Extract<ProcessRunStatus, 'completed' | 'failed'>;

  @ApiPropertyOptional({
    example: { publicationsChecked: 340, correctionsQueued: 4 },
    description:
      'Contadores propios del proceso. Se guardan tal cual en summary_json.',
  })
  @IsOptional()
  summary?: unknown;

  @ApiPropertyOptional({ example: 'Timeout consultando MELI' })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class ListProcessRunsQueryDTO {
  @ApiPropertyOptional({ example: 'meli_reconciliation' })
  @IsOptional()
  @IsString()
  processName?: string;

  @ApiPropertyOptional({ example: 'completed', enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: ProcessRunStatus;

  @ApiPropertyOptional({ example: 'cron', enum: TRIGGER_TYPES })
  @IsOptional()
  @IsIn(TRIGGER_TYPES)
  triggerType?: ProcessRunTriggerType;

  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'Desde, inclusive. Fecha calendario de la base de datos.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({
    example: '2026-09-08',
    description: 'Hasta, inclusive. Fecha calendario de la base de datos.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class ProcessRunAnalyticsQueryDTO {
  @ApiPropertyOptional({ example: 'meli_reconciliation' })
  @IsOptional()
  @IsString()
  processName?: string;

  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'Desde, inclusive. Por defecto, 7 días atrás.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({
    example: '2026-09-08',
    description: 'Hasta, inclusive. Por defecto, hoy en la base de datos.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
