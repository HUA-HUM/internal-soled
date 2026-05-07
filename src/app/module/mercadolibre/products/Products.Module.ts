import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CursorController } from 'src/app/controller/mercadolibre/internal/products/Cursor.controller';
import { DeltaController } from 'src/app/controller/mercadolibre/internal/products/Delta.controller';
import { ProductsController } from 'src/app/controller/mercadolibre/internal/products/Products.controller';
import { SQLMeliDeltaRepository } from 'src/app/driver/mercadolibre/delta/SQLMeliDeltaRepository';
import { SQLMeliProductsRepository } from 'src/app/driver/mercadolibre/products/SQLMeliProductsRepository';
import { MeliProductsService } from 'src/app/services/mercadolibre/products/MeliProductsService';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [ProductsController, DeltaController, CursorController],
  providers: [
    {
      provide: 'ISQLMeliProductsRepository',
      useClass: SQLMeliProductsRepository,
    },
    {
      provide: 'ISQLMeliProductDeltasRepository',
      useClass: SQLMeliDeltaRepository,
    },
    MeliProductsService,
  ],
  exports: [MeliProductsService],
})
export class ProductsModule {}
