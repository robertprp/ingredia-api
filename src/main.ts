import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  app.use('/additives', json({ limit: '16kb' }));
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
bootstrap()
  .then(() => console.log('Listening on port 3000'))
  .catch((err) => console.log(err));
