import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Проверка подключения к БД и очистка проблемных данных
  try {
    const dataSource = app.get(DataSource);
    await dataSource.query('SELECT 1');
    
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
    
    console.log('✅ Database connection: SUCCESS');
  } catch (error) {
    console.error('❌ Database connection: FAILED');
    console.error('Error:', error.message);
  }
  
  // Глобальная валидация
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
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
