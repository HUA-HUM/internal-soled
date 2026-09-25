import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoresaProductsInMeliController } from 'src/app/controller/coresa-products-in-mercadolibre/internal/CoresaProductsInMeli.controller';
import { SQLCoresaProductsInMeliRepository } from 'src/app/driver/coresa-products-in-mercadolibre/SQLCoresaProductsInMeliRepository';
import { CoresaProductsInMeliService } from 'src/app/services/coresa-products-in-mercadolibre/CoresaProductsInMeliService';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [CoresaProductsInMeliController],
  providers: [
    {
      provide: 'ISQLCoresaProductsInMeliRepository',
      useClass: SQLCoresaProductsInMeliRepository,
    },
    CoresaProductsInMeliService,
  ],
  exports: [CoresaProductsInMeliService],
})
export class CoresaProductsInMeliModule {}
