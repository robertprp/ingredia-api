import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ADDITIVE_REPOSITORY } from '../modules/additives/application/ports/additive.repository.port';
import { ADDITIVE_RESEARCH } from '../modules/additives/application/ports/additive-research.port';
import { ImportAdditivesService } from '../modules/additives/application/services/import-additives.service';
import { ResearchAdditivesService } from '../modules/additives/application/services/research-additives.service';
import { PrismaAdditiveRepository } from '../modules/additives/infrastructure/persistence/prisma-additive.repository';
import { PpqAdditiveResearchAdapter } from '../modules/additives/infrastructure/research/ppq-additive-research.adapter';
import { AditivosAlimentariosSource } from '../modules/additives/infrastructure/sources/aditivos-alimentarios.source';
import { EAditivosSource } from '../modules/additives/infrastructure/sources/e-aditivos.source';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  providers: [
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
})
export class AdditivesCommandModule {}
