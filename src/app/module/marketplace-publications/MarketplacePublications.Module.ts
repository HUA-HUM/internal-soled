import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketplacePublicationsController } from 'src/app/controller/marketplace-publications/internal/MarketplacePublications.controller';
import { SQLMarketplacePublicationsRepository } from 'src/app/driver/marketplace-publications/SQLMarketplacePublicationsRepository';
import { MarketplacePublicationsService } from 'src/app/services/marketplace-publications/MarketplacePublicationsService';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [MarketplacePublicationsController],
  providers: [
    {
      provide: 'ISQLMarketplacePublicationsRepository',
      useClass: SQLMarketplacePublicationsRepository,
    },
    MarketplacePublicationsService,
  ],
  exports: [MarketplacePublicationsService],
})
export class MarketplacePublicationsModule {}
