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
        const databaseUrl = 
          process.env.DATABASE_URL || 
          process.env.DATABASE_PUBLIC_URL ||
          process.env.POSTGRES_URL ||
          process.env.POSTGRES_PRISMA_URL ||
          configService.get<string>('DATABASE_URL') || 
          configService.get<string>('DATABASE_PUBLIC_URL') ||
          configService.get<string>('POSTGRES_URL');
        
        if (!databaseUrl) {
          console.error('❌ DATABASE_URL must be defined');
          console.error('Available env vars:', Object.keys(process.env).filter(k => 
            k.includes('DATABASE') || k.includes('POSTGRES')
          ));
          throw new Error('DATABASE_URL or POSTGRES_URL must be defined');
        }

        // Убираем channel_binding=require из URL, так как это может вызывать проблемы
        // Оставляем только sslmode=require
        const cleanDatabaseUrl = databaseUrl.replace(/[&?]channel_binding=require/g, '');

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
            max: 10, // Максимум соединений в пуле
            connectionTimeoutMillis: 10000, // Таймаут подключения 10 секунд
          },
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
