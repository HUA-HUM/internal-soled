import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketplaceChangeActionsController } from 'src/app/controller/marketplace-change-actions/internal/MarketplaceChangeActions.controller';
import { SQLMarketplaceChangeActionsRepository } from 'src/app/driver/marketplace-change-actions/SQLMarketplaceChangeActionsRepository';
import { MarketplaceChangeActionsService } from 'src/app/services/marketplace-change-actions/MarketplaceChangeActionsService';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [MarketplaceChangeActionsController],
  providers: [
    {
      provide: 'ISQLMarketplaceChangeActionsRepository',
      useClass: SQLMarketplaceChangeActionsRepository,
    },
    MarketplaceChangeActionsService,
  ],
  exports: [MarketplaceChangeActionsService],
})
export class MarketplaceChangeActionsModule {}
