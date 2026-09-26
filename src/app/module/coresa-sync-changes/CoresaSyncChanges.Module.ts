import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoresaSyncChangesController } from 'src/app/controller/coresa-sync-changes/internal/CoresaSyncChanges.controller';
import { SQLCoresaSyncChangesRepository } from 'src/app/driver/coresa-sync-changes/SQLCoresaSyncChangesRepository';
import { CoresaSyncChangesService } from 'src/app/services/coresa-sync-changes/CoresaSyncChangesService';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [CoresaSyncChangesController],
  providers: [
    {
      provide: 'ISQLCoresaSyncChangesRepository',
      useClass: SQLCoresaSyncChangesRepository,
    },
    CoresaSyncChangesService,
  ],
  exports: [CoresaSyncChangesService],
})
export class CoresaSyncChangesModule {}
