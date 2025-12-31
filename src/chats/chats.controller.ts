import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { GetChatsQueryDto } from './dto/get-chats-query.dto';

/**
 * Контроллер для работы с чатами
 * Все эндпоинты доступны по префиксу /api/chats
 */
@ApiTags('chats')
@Controller('api/chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  /**
   * POST /api/chats
   * Создание нового чата или обновление существующего
   * 
   * Если передан chatId - обновляет существующий чат
   * Если chatId нет - создает новый чат
   * 
   * Вызывается:
   * - Через 2 минуты после последнего сообщения
   * - При закрытии чата (если есть сообщения)
   * - Только если сообщений > 1 (не сохраняет только приветствие)
   * - Один раз за сессию (флаг isDialogSaved)
   * 
   * При обновлении:
   * - Обновляет поля: phone, name, projectType, metrics
   * - Удаляет старые сообщения и добавляет все новые (полный список)
   * - Обновляет updated_at на текущее время
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Сохранение чата' })
  @ApiBody({ type: CreateChatDto })
  @ApiResponse({ status: 200, description: 'Чат успешно сохранен или обновлен' })
  @ApiResponse({ status: 400, description: 'Ошибка валидации' })
  async createChat(@Body() createChatDto: CreateChatDto, @Req() req: Request) {
    // Автоматически получаем IP и User-Agent из запроса, если не переданы
    const ipAddress =
      createChatDto.ipAddress ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      (req.socket?.remoteAddress);

    const userAgent =
      createChatDto.userAgent || (req.headers['user-agent'] as string);

    // Добавляем IP и User-Agent к данным
    const chatData = {
      ...createChatDto,
      ipAddress,
      userAgent,
    };

    const { chatId, updated } = await this.chatsService.createChat(chatData);

    return {
      success: true,
      chatId,
      updated,
      message: updated ? 'Chat updated successfully' : 'Chat saved successfully',
    };
  }

  /**
   * GET /api/chats
   * Получить список чатов с фильтрацией и пагинацией
   * 
   * Query параметры:
   * - page: номер страницы (по умолчанию 1)
   * - limit: количество на странице (по умолчанию 20, максимум 100)
   * - status: фильтр по статусу (new, contacted, in_progress, completed, archived)
   * - search: поиск по имени, телефону или типу проекта
   * - sortBy: поле сортировки (created_at, updated_at, message_count)
   * - sortOrder: порядок сортировки (asc, desc)
   * - dateFrom, dateTo: фильтр по дате (ISO 8601)
   * - hasPhone: только чаты с телефоном (true/false)
   * - hasName: только чаты с именем (true/false)
   */
  @Get()
  @ApiOperation({ summary: 'Получить список чатов' })
  @ApiResponse({ status: 200, description: 'Список чатов успешно получен' })
  async getChats(@Query() query: GetChatsQueryDto) {
    const data = await this.chatsService.getChats(query);
    return {
      success: true,
      data,
    };
  }

  /**
   * GET /api/chats/stats
   * Получить статистику по чатам
   */
  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику по чатам' })
  @ApiResponse({ status: 200, description: 'Статистика успешно получена' })
  @ApiResponse({ status: 500, description: 'Ошибка при получении статистики' })
  async getStats() {
    try {
      const data = await this.chatsService.getStats();
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      // Логируем ошибку для отладки
      console.error('Error in getStats:', error.message);
      throw error; // NestJS обработает ошибку через глобальный exception filter
    }
  }

  /**
   * GET /api/chats/:id
   * Получить детали конкретного чата по ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Получить детали чата по ID' })
  @ApiParam({ name: 'id', description: 'UUID чата' })
  @ApiResponse({ status: 200, description: 'Детали чата успешно получены' })
  @ApiResponse({ status: 404, description: 'Чат не найден' })
  async getChatById(@Param('id') id: string) {
    const data = await this.chatsService.getChatById(id);
    return {
      success: true,
      data,
    };
  }

  /**
   * PATCH /api/chats/:id
   * Обновить статус или заметки чата
   * 
   * Можно обновить:
   * - status: новый статус чата
   * - notes: заметки админа (максимум 5000 символов)
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Обновить статус или заметки чата' })
  @ApiParam({ name: 'id', description: 'UUID чата' })
  @ApiBody({ type: UpdateChatDto })
  @ApiResponse({ status: 200, description: 'Чат успешно обновлен' })
  @ApiResponse({ status: 404, description: 'Чат не найден' })
  async updateChat(
    @Param('id') id: string,
    @Body() updateChatDto: UpdateChatDto,
  ) {
    await this.chatsService.updateChat(id, updateChatDto);
    return {
      success: true,
      message: 'Chat updated successfully',
    };
  }
}
