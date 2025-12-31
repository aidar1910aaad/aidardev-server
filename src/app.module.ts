import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DefaultNamingStrategy } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatsModule } from './chats/chats.module';

class SnakeNamingStrategy extends DefaultNamingStrategy {
  columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    if (customName) return customName;
    return propertyName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }

  tableName(className: string, customName: string): string {
    if (customName) return customName;
    return className.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // В production используем переменные окружения системы, в development - .env файл
      envFilePath: process.env.NODE_ENV === 'production' ? undefined : '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // В production переменные окружения берутся из системы (Railway, Neon, etc.)
        // В development - из .env файла
        // Проверяем все возможные варианты переменных от Neon
        
        // Приоритет: используем pooler URL (более надежен для Railway)
        // Сначала проверяем process.env напрямую
        const databaseUrl = 
          process.env.POSTGRES_URL || // Pooler URL от Neon (приоритет)
          process.env.DATABASE_PUBLIC_URL || // Public URL с pooler
          process.env.DATABASE_URL || 
          process.env.POSTGRES_PRISMA_URL ||
          process.env.POSTGRES_URL_NO_SSL;
        
        // Если не нашли, пробуем через ConfigService
        const databaseUrlFromConfig = databaseUrl || 
          configService.get<string>('POSTGRES_URL') ||
          configService.get<string>('DATABASE_PUBLIC_URL') ||
          configService.get<string>('DATABASE_URL') || 
          configService.get<string>('POSTGRES_PRISMA_URL');
        
        if (!databaseUrlFromConfig) {
          console.error('❌ DATABASE_URL must be defined');
          console.error('Checking process.env directly...');
          console.error('POSTGRES_URL:', process.env.POSTGRES_URL ? '✅ Found' : '❌ Not found');
          console.error('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Found' : '❌ Not found');
          console.error('DATABASE_PUBLIC_URL:', process.env.DATABASE_PUBLIC_URL ? '✅ Found' : '❌ Not found');
          
          console.error('All env vars with DATABASE/POSTGRES:', 
            Object.keys(process.env)
              .filter(k => k.includes('DATABASE') || k.includes('POSTGRES'))
              .map(k => `${k}=${process.env[k]?.substring(0, 50)}...`)
          );
          
          console.error('\n💡 В Railway нужно:');
          console.error('1. Открыть настройки вашего сервиса (не проекта)');
          console.error('2. Перейти в раздел "Variables"');
          console.error('3. Добавить переменную POSTGRES_URL (pooler URL от Neon)');
          console.error('4. Перезапустить сервис\n');
          
          throw new Error('DATABASE_URL or POSTGRES_URL must be defined in Railway environment variables');
        }

        // Очищаем URL: убираем channel_binding=require и добавляем нужные параметры
        let cleanDatabaseUrl = databaseUrlFromConfig.replace(/[&?]channel_binding=require/g, '');
        
        // Убеждаемся, что есть sslmode=require
        if (!cleanDatabaseUrl.includes('sslmode=')) {
          cleanDatabaseUrl += (cleanDatabaseUrl.includes('?') ? '&' : '?') + 'sslmode=require';
        }
        
        // Добавляем параметры для надежности подключения
        const urlParams = new URLSearchParams(cleanDatabaseUrl.split('?')[1] || '');
        urlParams.set('connect_timeout', '30'); // Увеличиваем таймаут подключения до 30 секунд
        urlParams.set('sslmode', 'require');
        
        const baseUrl = cleanDatabaseUrl.split('?')[0];
        cleanDatabaseUrl = `${baseUrl}?${urlParams.toString()}`;
        
        console.log('✅ Database URL found:', cleanDatabaseUrl.substring(0, 60) + '...');
        console.log('📊 Using pooler connection (more reliable for Railway)');

        return {
          type: 'postgres',
          url: cleanDatabaseUrl,
          autoLoadEntities: true,
          synchronize: process.env.NODE_ENV !== 'production', // Автоматическое создание таблиц в development
          namingStrategy: new SnakeNamingStrategy(),
          ssl: {
            rejectUnauthorized: false,
          },
          // Дополнительные настройки для надежности подключения
          extra: {
            max: 20, // Увеличиваем пул соединений
            connectionTimeoutMillis: 30000, // Увеличиваем таймаут до 30 секунд
            idleTimeoutMillis: 30000, // Таймаут простоя соединения
            statement_timeout: 30000, // Таймаут выполнения запроса
          },
          // Настройки для retry при ошибках подключения
          retryAttempts: 3,
          retryDelay: 3000,
        };
      },
      inject: [ConfigService],
    }),
    ChatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
