import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AdditivesCommandModule } from './additives-command.module';
import { normalizeENumber } from '../modules/additives/domain/additive.types';
import { ResearchAdditivesService } from '../modules/additives/application/services/research-additives.service';

interface CommandOptions {
  eNumber?: string;
  limit?: number;
  concurrency?: number;
  refresh?: boolean;
}

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(
    AdditivesCommandModule,
    {
      logger: ['error', 'warn', 'log', 'debug'],
    },
  );
  try {
    const result = await app
      .get(ResearchAdditivesService)
      .run(parseArguments(process.argv.slice(2)));
    Logger.log(JSON.stringify(result, null, 2), 'AdditiveResearchIndexer');
    if (result.failed > 0) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

function parseArguments(arguments_: string[]): CommandOptions {
  const options: CommandOptions = {};
  for (const argument of arguments_) {
    if (argument === '--refresh') {
      options.refresh = true;
      continue;
    }
    const [name, value] = argument.split('=', 2);
    if (!value) throw new Error(`Invalid argument: ${argument}`);
    if (name === '--limit') options.limit = parseInteger(value, name);
    else if (name === '--concurrency') {
      options.concurrency = parseInteger(value, name);
    } else if (name === '--code') {
      const eNumber = normalizeENumber(value);
      if (!eNumber) throw new Error(`Invalid E-number: ${value}`);
      options.eNumber = eNumber;
    } else {
      throw new Error(`Unknown argument: ${name}`);
    }
  }
  return options;
}

function parseInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer.`);
  return parsed;
}

void run().catch((error: unknown) => {
  Logger.error(
    error instanceof Error ? error.message : error,
    'AdditiveResearchIndexer',
  );
  process.exitCode = 1;
});
