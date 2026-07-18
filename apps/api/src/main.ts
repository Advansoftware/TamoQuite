import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api');

  // Validate/coerce DTOs that use class-validator; strips unknown props.
  // Endpoints still typed with plain interfaces are unaffected.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }),
  );

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
