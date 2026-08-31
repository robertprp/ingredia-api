import { Module } from '@nestjs/common';
import { ADDITIVE_REPOSITORY } from './application/ports/additive.repository.port';
import { AnalyzeIngredientsService } from './application/services/analyze-ingredients.service';
import { ImportAdditivesService } from './application/services/import-additives.service';
import { PrismaAdditiveRepository } from './infrastructure/persistence/prisma-additive.repository';
import { AditivosAlimentariosSource } from './infrastructure/sources/aditivos-alimentarios.source';
import { EAditivosSource } from './infrastructure/sources/e-aditivos.source';
import { AdditivesController } from './presentation/http/additives.controller';

@Module({
  controllers: [AdditivesController],
  providers: [
    AnalyzeIngredientsService,
    ImportAdditivesService,
    AditivosAlimentariosSource,
    EAditivosSource,
    PrismaAdditiveRepository,
    {
      provide: ADDITIVE_REPOSITORY,
      useExisting: PrismaAdditiveRepository,
    },
  ],
  exports: [ImportAdditivesService],
})
export class AdditivesModule {}
