import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { ClsService } from 'nestjs-cls';
import {
  ResponseInterceptor,
  controllersExcludes,
  ExceptionsFilter,
  HttpClientInterceptor,
  LoggingService,
  LoggingInterceptor,
} from '@galicia-toolkit-nestjs-20-lite/paas';
import { completePropertiesAPIM } from '@galicia-toolkit-nestjs-20/swagger';
import { manifestControllerExcludes } from '@galicia-toolkit-nestjs-20/archetype';
import { config } from './config';
import { AppModule } from './app.module';
async function bootstrap() {
  const { server, swagger, project } = config();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new LoggingService('info', await app.resolve<ClsService>(ClsService), config());
  app.useLogger(logger);
  app.setGlobalPrefix(`${server.context}`, {
    exclude: [...controllersExcludes, ...manifestControllerExcludes],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      validatorPackage: require('@nestjs/class-validator'),
      transformerPackage: require('class-transformer'),
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  const loggingServiceInstance = await app.resolve<LoggingService>(LoggingService);
  const clsServiceInstance = await app.resolve<ClsService>(ClsService);
  app.useGlobalInterceptors(
    new LoggingInterceptor(loggingServiceInstance, clsServiceInstance),
    new HttpClientInterceptor(clsServiceInstance),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new ExceptionsFilter(loggingServiceInstance, clsServiceInstance));

  app.useGlobalFilters(
    new ExceptionsFilter(
      await app.resolve<LoggingService>(LoggingService),
      await app.resolve<ClsService>(ClsService),
    ),
  );

  app.use(cookieParser());
  app.disable('x-powered-by');

  if (server.corsEnabled) {
    app.enableCors({
      origin: server.origins,
      allowedHeaders: `${server.allowedHeaders}`,
      methods: `${server.allowedMethods}`,
      credentials: server.corsCredentials,
    });
  }

  if (swagger.enabled) {
    const config = new DocumentBuilder()
      .setTitle(`${project.name}`)
      .setVersion(`${project.version}`)
      .setDescription(`Swagger - ${project.description}`)
      .setExternalDoc('Documentation', project.documentation)
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'access-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    completePropertiesAPIM(document);
    SwaggerModule.setup(`${swagger.path}`, app, document);
  }

  await app.listen(server.port, () => {
    logger.log(
      process.env.NODE_ENV !== 'production'
        ? `App running on: http://localhost:${server.port}`
        : `App running.`,
    );
  });
}

bootstrap();
