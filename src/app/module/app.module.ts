import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenModule } from './mercadolibre/tokens/Token.Module';
import { ProductsModule } from './mercadolibre/products/Products.Module';
import { PublisherModule } from './publisher/Publisher.Module';
import { MarketplacePublicationsModule } from './marketplace-publications/MarketplacePublications.Module';
import { MarketplaceChangeActionsModule } from './marketplace-change-actions/MarketplaceChangeActions.Module';
import { ProcessRunsModule } from './process-runs/ProcessRuns.Module';
import { CoresaPublicationsModule } from './coresa-publications/CoresaPublications.Module';
import { CoresaProductsModule } from './coresa-products/CoresaProducts.Module';
import { CoresaProductsInMeliModule } from './coresa-products-in-mercadolibre/CoresaProductsInMeli.Module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      synchronize: false,
    }),

    TokenModule,
    ProductsModule,
    PublisherModule,
    MarketplacePublicationsModule,
    MarketplaceChangeActionsModule,
    ProcessRunsModule,
    CoresaPublicationsModule,
    CoresaProductsModule,
    CoresaProductsInMeliModule,
  ],
})
export class AppModule {}
