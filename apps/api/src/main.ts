import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, MethodNotAllowedException } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';

//Punto de inicio de la API
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const enableContentSecurity = process.env['NODE_ENV'] == 'development' ? false : true;

  //Helmet agrega varios header de seguridad a las responses http
  app.use(helmet({
    contentSecurityPolicy: enableContentSecurity,
     hsts: { 
      maxAge: 31_536_000, 
      includeSubDomains: true,
    },
  }));

  app.setGlobalPrefix('v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          
      forbidNonWhitelisted: true, 
      transform: true,           
    }),
  );

  app.enableCors({
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
  Logger.log(`API corriendo en http://localhost:${port}/v1`, 'Bootstrap');
}

bootstrap();