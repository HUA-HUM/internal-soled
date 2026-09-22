import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoresaPublicationsController } from 'src/app/controller/coresa-publications/internal/CoresaPublications.controller';
import { SQLCoresaPublicationsRepository } from 'src/app/driver/coresa-publications/SQLCoresaPublicationsRepository';
import { CoresaPublicationsService } from 'src/app/services/coresa-publications/CoresaPublicationsService';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [CoresaPublicationsController],
  providers: [
    {
      provide: 'ISQLCoresaPublicationsRepository',
      useClass: SQLCoresaPublicationsRepository,
    },
    CoresaPublicationsService,
  ],
  exports: [CoresaPublicationsService],
})
export class CoresaPublicationsModule {}
