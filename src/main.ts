import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  
  // Логирование всех HTTP запросов
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const logMessage = `${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip || 'unknown'}`;
      
      if (statusCode >= 500) {
        logger.error(logMessage);
      } else if (statusCode >= 400) {
        logger.warn(logMessage);
      } else {
        logger.log(logMessage);
      }
    });
    
    next();
  });
  
  // Проверка подключения к БД и очистка проблемных данных
  try {
    const dataSource = app.get(DataSource);
    
    // Проверяем подключение
    await dataSource.query('SELECT 1');
    
    // Получаем информацию о базе данных
    const dbInfo = await dataSource.query('SELECT current_database() as database, version() as version');
    const dbName = dbInfo[0]?.database || 'unknown';
    const dbVersion = dbInfo[0]?.version?.split(',')[0] || 'unknown';
    
    // Проверяем существование таблиц
    const tables = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('✅ Database connection: SUCCESS');
    console.log(`📊 Database: ${dbName}`);
    console.log(`🔧 Version: ${dbVersion}`);
    console.log(`📋 Tables (${tables.length}): ${tables.map((t: any) => t.table_name).join(', ') || 'none'}`);
    
    // Очищаем записи с NULL chat_id (если они есть)
    try {
      const result = await dataSource.query(
        'DELETE FROM chat_messages WHERE chat_id IS NULL',
      );
      if (result && result.length > 0) {
        console.log('🧹 Cleaned up orphaned messages');
      }
    } catch (cleanupError) {
      // Игнорируем ошибки очистки (таблица может не существовать)
    }
  } catch (error: any) {
    console.error('❌ Database connection: FAILED');
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.address) {
      console.error('Address:', error.address);
    }
    if (error.port) {
      console.error('Port:', error.port);
    }
    console.error('\n💡 Проверьте:');
    console.error('1. Правильность DATABASE_URL в .env файле');
    console.error('2. Доступность базы данных Neon');
    console.error('3. Интернет соединение');
    console.error('4. Параметры SSL в URL подключения\n');
  }
  
  // Глобальная валидация
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Разрешаем дополнительные поля (особенно в metrics)
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  
  // Настройка Swagger
  const config = new DocumentBuilder()
    .setTitle('AidarDev Server API')
    .setDescription('API для системы чатов AidarDev')
    .setVersion('1.0')
    .addTag('chats', 'Операции с чатами')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  // Настройка CORS для aidardev.kz и его поддоменов
  app.enableCors({
    origin: (origin, callback) => {
      // Разрешаем запросы без origin (например, Postman, мобильные приложения)
      if (!origin) {
        return callback(null, true);
      }
      
      // Проверяем, что origin соответствует aidardev.kz или его поддоменам
      const allowedOrigins = [
        /^https?:\/\/(.*\.)?aidardev\.kz$/,
        /^https?:\/\/aidardev\.kz$/,
      ];
      
      const isAllowed = allowedOrigins.some((pattern) =>
        pattern.test(origin),
      );
      
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  
  console.log(`\n🚀 Server is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs\n`);
}

bootstrap();
