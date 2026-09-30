import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeliFinancingCostsController } from 'src/app/controller/meli-financing-costs/internal/MeliFinancingCosts.controller';
import { SQLMeliFinancingCostsRepository } from 'src/app/driver/meli-financing-costs/SQLMeliFinancingCostsRepository';
import { MeliFinancingCostsService } from 'src/app/services/meli-financing-costs/MeliFinancingCostsService';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [MeliFinancingCostsController],
  providers: [
    {
      provide: 'ISQLMeliFinancingCostsRepository',
      useClass: SQLMeliFinancingCostsRepository,
    },
    MeliFinancingCostsService,
  ],
  exports: [MeliFinancingCostsService],
})
export class MeliFinancingCostsModule {}
