import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublisherJobsController } from 'src/app/controller/publisher/internal/PublisherJobs.controller';
import { PublisherRunsController } from 'src/app/controller/publisher/internal/PublisherRuns.controller';
import { SQLPublisherRepository } from 'src/app/driver/publisher/SQLPublisherRepository';
import { PublisherService } from 'src/app/services/publisher/PublisherService';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [PublisherJobsController, PublisherRunsController],
  providers: [
    {
      provide: 'ISQLPublisherRepository',
      useClass: SQLPublisherRepository,
    },
    PublisherService,
  ],
  exports: [PublisherService],
})
export class PublisherModule {}
