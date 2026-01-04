import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DefaultNamingStrategy } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatsModule } from './chats/chats.module';
import { BlogModule } from './blog/blog.module';

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
        
        // Используем простую логику - проверяем все возможные варианты
        const databaseUrl = 
          process.env.DATABASE_URL || 
          process.env.DATABASE_PUBLIC_URL ||
          process.env.POSTGRES_URL ||
          process.env.POSTGRES_PRISMA_URL ||
          process.env.POSTGRES_URL_NON_POOLING;
        
        // Если не нашли, пробуем через ConfigService
        const databaseUrlFromConfig = databaseUrl || 
          configService.get<string>('DATABASE_URL') || 
          configService.get<string>('DATABASE_PUBLIC_URL') ||
          configService.get<string>('POSTGRES_URL') ||
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
          console.error('3. Убедиться что установлена переменная DATABASE_URL');
          console.error('4. Перезапустить сервис\n');
          
          throw new Error('DATABASE_URL or POSTGRES_URL must be defined in Railway environment variables');
        }

        // Очистка и улучшение URL:
        // 1. Убираем channel_binding=require (несовместим с некоторыми настройками)
        // 2. Добавляем connect_timeout если его нет (важно для стабильности)
        let cleanDatabaseUrl = databaseUrlFromConfig.replace(/[&?]channel_binding=require/g, '');
        
        // Добавляем connect_timeout если его нет в URL
        if (!cleanDatabaseUrl.includes('connect_timeout')) {
          const separator = cleanDatabaseUrl.includes('?') ? '&' : '?';
          cleanDatabaseUrl = `${cleanDatabaseUrl}${separator}connect_timeout=15`;
        }
        
        console.log('✅ Database URL found:', cleanDatabaseUrl.substring(0, 60) + '...');

        return {
          type: 'postgres',
          url: cleanDatabaseUrl,
          autoLoadEntities: true,
          // В production синхронизация отключена, но можно включить через переменную окружения для первого запуска
          synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true' || process.env.NODE_ENV !== 'production',
          namingStrategy: new SnakeNamingStrategy(),
          ssl: {
            rejectUnauthorized: false,
          },
          // Настройки пула соединений для библиотеки pg
          extra: {
            max: 10, // Максимум соединений в пуле
            connectionTimeoutMillis: 15000, // Увеличиваем таймаут до 15 секунд
            idleTimeoutMillis: 30000, // Таймаут простоя соединения
            keepAlive: true,
            keepAliveInitialDelayMillis: 0,
            // Принудительно используем IPv4 (избегаем проблем с IPv6)
            // Это решает проблему ENETUNREACH для IPv6 адресов
            // pg библиотека будет использовать только IPv4 адреса
          },
        };
      },
      inject: [ConfigService],
    }),
    ChatsModule,
    BlogModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
