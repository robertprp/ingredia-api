import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { json } from 'express';
import { ApiExceptionFilter } from './common/http/api-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  app.use('/additives', json({ limit: '16kb' }));
  app.use('/billing', json({ limit: '64kb' }));
  app.use(
    '/api/v1',
    json({
      limit: '256kb',
      verify: (request, _response, buffer) => {
        (request as typeof request & { rawBody?: Buffer }).rawBody =
          Buffer.from(buffer);
      },
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Aditivos App API')
    .setDescription('Ingredient scanning and food-additive catalog API')
    .setVersion('1.0')
    .addTag('additives')
    .addTag('catalog')
    .addTag('billing')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory); // /api to get swagger document
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap()
  .then(() => Logger.log('API is listening.', 'Bootstrap'))
  .catch((error: unknown) => Logger.error(error, 'Bootstrap'));
