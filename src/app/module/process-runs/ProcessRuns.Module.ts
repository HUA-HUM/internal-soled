import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessRunsController } from 'src/app/controller/process-runs/internal/ProcessRuns.controller';
import { SQLProcessRunsRepository } from 'src/app/driver/process-runs/SQLProcessRunsRepository';
import { ProcessRunsService } from 'src/app/services/process-runs/ProcessRunsService';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [ProcessRunsController],
  providers: [
    {
      provide: 'ISQLProcessRunsRepository',
      useClass: SQLProcessRunsRepository,
    },
    ProcessRunsService,
  ],
  exports: [ProcessRunsService],
})
export class ProcessRunsModule {}
