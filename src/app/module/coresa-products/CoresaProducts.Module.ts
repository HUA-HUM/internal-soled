import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoresaProductsController } from 'src/app/controller/coresa-products/internal/CoresaProducts.controller';
import { SQLCoresaProductsRepository } from 'src/app/driver/coresa-products/SQLCoresaProductsRepository';
import { CoresaProductsService } from 'src/app/services/coresa-products/CoresaProductsService';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [CoresaProductsController],
  providers: [
    {
      provide: 'ISQLCoresaProductsRepository',
      useClass: SQLCoresaProductsRepository,
    },
    CoresaProductsService,
  ],
  exports: [CoresaProductsService],
})
export class CoresaProductsModule {}
