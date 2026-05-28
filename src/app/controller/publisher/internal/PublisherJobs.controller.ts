import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { InternalApiKeyGuard } from 'src/app/guards/internal-api-key.guard';
import { PublisherService } from 'src/app/services/publisher/PublisherService';
import {
  PublisherJobDetail,
  PublisherJobRow,
  PublisherListResult,
} from 'src/core/entitis/publisher/PublisherTypes';
import {
  CreatePublisherJobDTO,
  ListPublisherJobsQueryDTO,
} from './dto/PublisherDTO';

@ApiTags('Publisher - Internal Jobs')
@ApiSecurity('internal-api-key')
@Controller('internal/publisher/jobs')
@UseGuards(InternalApiKeyGuard)
export class PublisherJobsController {
  constructor(private readonly publisherService: PublisherService) {}

  @Post()
  @ApiOperation({ summary: 'Crea un job de publicación' })
  @ApiBody({ type: CreatePublisherJobDTO })
  createJob(@Body() body: CreatePublisherJobDTO): Promise<PublisherJobDetail> {
    return this.publisherService.createJob(body);
  }

  @Get()
  @ApiOperation({ summary: 'Lista jobs de publicación' })
  @ApiQuery({ name: 'status', required: false, example: 'processing' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  listJobs(
    @Query() query: ListPublisherJobsQueryDTO,
  ): Promise<PublisherListResult<PublisherJobRow>> {
    return this.publisherService.listJobs(query);
  }

  @Get(':jobId')
  @ApiOperation({ summary: 'Obtiene un job por ID' })
  @ApiParam({ name: 'jobId', example: 'pub_1780000000000_ab12cd34' })
  getJob(@Param('jobId') jobId: string): Promise<PublisherJobDetail> {
    return this.publisherService.getJob(jobId);
  }

  @Post(':jobId/cancel')
  @ApiOperation({ summary: 'Cancela un job de publicación' })
  @ApiParam({ name: 'jobId', example: 'pub_1780000000000_ab12cd34' })
  cancelJob(
    @Param('jobId') jobId: string,
  ): Promise<{ ok: true; jobId: string; status: string }> {
    return this.publisherService.cancelJob(jobId);
  }
}
