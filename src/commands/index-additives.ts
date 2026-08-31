import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ImportAdditivesService } from '../modules/additives/application/services/import-additives.service';

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const sourceKey = process.argv[2];
    const results = await app.get(ImportAdditivesService).importAll(sourceKey);
    Logger.log(JSON.stringify(results, null, 2), 'AdditiveIndexer');
    if (results.some((result) => result.failed > 0)) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void run().catch((error: unknown) => {
  Logger.error(
    error instanceof Error ? error.message : error,
    'AdditiveIndexer',
  );
  process.exitCode = 1;
});
