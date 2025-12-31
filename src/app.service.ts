import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth() {
    try {
      // Проверяем подключение к БД
      await this.dataSource.query('SELECT 1');
      
      // Получаем информацию о базе данных
      const dbInfo = await this.dataSource.query(
        'SELECT current_database() as database, version() as version',
      );
      
      // Проверяем существование таблиц
      const tables = await this.dataSource.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      // Подсчитываем записи в таблицах
      const tableCounts: Record<string, number> = {};
      for (const table of tables) {
        try {
          const count = await this.dataSource.query(
            `SELECT COUNT(*) as count FROM ${table.table_name}`,
          );
          tableCounts[table.table_name] = parseInt(count[0]?.count || '0');
        } catch (e) {
          tableCounts[table.table_name] = 0;
        }
      }

      return {
        status: 'ok',
        database: {
          name: dbInfo[0]?.database || 'unknown',
          version: dbInfo[0]?.version?.split(',')[0] || 'unknown',
          connected: true,
        },
        tables: tables.map((t: any) => ({
          name: t.table_name,
          count: tableCounts[t.table_name] || 0,
        })),
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: 'error',
        database: {
          connected: false,
          error: error.message,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
