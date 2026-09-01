import { Module } from '@nestjs/common';
import { ADDITIVE_REPOSITORY } from './application/ports/additive.repository.port';
import { AnalyzeIngredientsService } from './application/services/analyze-ingredients.service';
import { ImportAdditivesService } from './application/services/import-additives.service';
import { PrismaAdditiveRepository } from './infrastructure/persistence/prisma-additive.repository';
import { AditivosAlimentariosSource } from './infrastructure/sources/aditivos-alimentarios.source';
import { EAditivosSource } from './infrastructure/sources/e-aditivos.source';
import {
  AdditivesController,
  VersionedAdditivesController,
} from './presentation/http/additives.controller';
import { CatalogAdditivesService } from './application/services/catalog-additives.service';
import { ADDITIVE_RESEARCH } from './application/ports/additive-research.port';
import { ResearchAdditivesService } from './application/services/research-additives.service';
import { PpqAdditiveResearchAdapter } from './infrastructure/research/ppq-additive-research.adapter';

@Module({
  controllers: [AdditivesController, VersionedAdditivesController],
  providers: [
    AnalyzeIngredientsService,
    CatalogAdditivesService,
    ImportAdditivesService,
    ResearchAdditivesService,
    AditivosAlimentariosSource,
    EAditivosSource,
    PrismaAdditiveRepository,
    PpqAdditiveResearchAdapter,
    {
      provide: ADDITIVE_REPOSITORY,
      useExisting: PrismaAdditiveRepository,
    },
    {
      provide: ADDITIVE_RESEARCH,
      useExisting: PpqAdditiveResearchAdapter,
    },
  ],
  exports: [
    AnalyzeIngredientsService,
    ImportAdditivesService,
    ResearchAdditivesService,
  ],
})
export class AdditivesModule {}
