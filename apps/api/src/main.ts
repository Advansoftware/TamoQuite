import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api');

  const webOrigin = process.env.WEB_ORIGIN;
  app.enableCors({
    origin: webOrigin ? webOrigin.split(',').map((o) => o.trim()) : true,
    credentials: true,
  });

  const port = Number(process.env.PORT) || 3042;
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`TamoQuite API listening on :${port} (prefix /api)`);
}

bootstrap();
