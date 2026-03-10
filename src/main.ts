import { NestFactory } from '@nestjs/core';
import { setupSwagger } from './app/common/swagger/swagger.setup';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/module/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  setupSwagger(app, 'Soled API', 'API principal de Soled DB', ['']);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');

  console.log(`API running on port ${process.env.PORT ?? 3000}`);
}
bootstrap();
