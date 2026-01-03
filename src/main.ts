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
    
    // Проверяем, есть ли переменные окружения
    const hasPostgresUrl = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL);
    console.error('\n💡 Проверьте:');
    if (!hasPostgresUrl) {
      console.error('1. ❌ Переменные окружения не найдены!');
      console.error('   Добавьте POSTGRES_URL в Variables вашего сервиса Railway');
    } else {
      console.error('1. ✅ Переменные окружения найдены');
    }
    console.error('2. Проверьте доступность базы данных Neon');
    console.error('3. Убедитесь, что используете pooler URL (с -pooler в адресе)');
    console.error('4. Проверьте интернет соединение Railway → Neon');
    console.error('5. Убедитесь, что SSL параметры правильные (sslmode=require)\n');
    console.error('⚠️  Приложение запустится, но API не будет работать без БД\n');
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
  
  // В Railway PORT устанавливается автоматически, используем его
  // В development используем 3001 по умолчанию
  const port = process.env.PORT || 3001;
  
  // Graceful shutdown для корректного завершения процесса
  // Это решает проблему EADDRINUSE при перезапуске в watch режиме
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down gracefully');
    await app.close();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    logger.log('SIGINT received, shutting down gracefully');
    await app.close();
    process.exit(0);
  });
  
  try {
    await app.listen(port, '0.0.0.0'); // Слушаем на всех интерфейсах для Railway
    
    console.log(`\n🚀 Server is running on port ${port}`);
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      console.log(`🌐 Public URL: https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
      console.log(`📚 Swagger: https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api/docs`);
    } else {
      console.log(`🌐 Local URL: http://localhost:${port}`);
      console.log(`📚 Swagger: http://localhost:${port}/api/docs`);
    }
    console.log('');
  } catch (error: any) {
    if (error.code === 'EADDRINUSE') {
      logger.error(`❌ Port ${port} is already in use!`);
      logger.error('\n💡 Решение:');
      logger.error('1. Найдите процесс: netstat -ano | findstr :3001');
      logger.error('2. Убейте процесс: taskkill /F /PID <номер_процесса>');
      logger.error('3. Или перезапустите терминал и запустите снова\n');
      process.exit(1);
    }
    throw error;
  }
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
