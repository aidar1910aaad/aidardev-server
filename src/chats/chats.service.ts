import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, IsNull } from 'typeorm';
import { Chat, ChatStatus } from '../entities/chat.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { GetChatsQueryDto, SortBy } from './dto/get-chats-query.dto';

/**
 * Сервис для работы с чатами
 * Содержит всю бизнес-логику работы с чатами и сообщениями
 */
@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
  ) {}

  /**
   * Создание или обновление чата
   * 
   * Если передан chatId - обновляет существующий чат
   * Если chatId нет - создает новый чат
   * 
   * Валидация:
   * - Минимум 2 сообщения (не сохраняет только приветствие)
   * - timestamp обязателен
   * - sender должен быть 'bot' или 'user'
   * - text не должен быть пустым
   */
  async createChat(createChatDto: CreateChatDto): Promise<{ chatId: string; updated: boolean }> {
    // Проверяем, что есть минимум 2 сообщения
    if (!createChatDto.messages || createChatDto.messages.length < 2) {
      throw new BadRequestException('Chat must contain at least 2 messages');
    }

    // Если передан chatId - обновляем существующий чат
    if (createChatDto.chatId) {
      return this.updateExistingChat(createChatDto);
    }

    // Иначе создаем новый чат
    return this.createNewChat(createChatDto);
  }

  /**
   * Создание нового чата
   */
  private async createNewChat(createChatDto: CreateChatDto): Promise<{ chatId: string; updated: boolean }> {
    // Создаем запись чата в БД
    const chat = this.chatRepository.create({
      phone: createChatDto.phone,
      name: createChatDto.name,
      projectType: createChatDto.projectType,
      language: createChatDto.language || 'ru',
      messageCount: createChatDto.messages.length,
      // Метрики извлекаются на фронтенде и передаются готовыми
      hasPriceObjection: createChatDto.metrics?.hasPriceObjection || false,
      hasNegativeResponse: createChatDto.metrics?.hasNegativeResponse || false,
      hasName: createChatDto.metrics?.hasName || false,
      askedForContact: createChatDto.metrics?.askedForContact || false,
      hasUncertainty: createChatDto.metrics?.hasUncertainty || false,
      uncertaintyCount: createChatDto.metrics?.uncertaintyCount || 0,
      userAgent: createChatDto.userAgent,
      ipAddress: createChatDto.ipAddress,
      status: ChatStatus.NEW, // По умолчанию новый чат
    });

    const savedChat = await this.chatRepository.save(chat);

    // Сохраняем все сообщения чата
    const messages = createChatDto.messages.map((msg) =>
      this.messageRepository.create({
        chatId: savedChat.id,
        sender: msg.sender,
        text: msg.text,
        createdAt: new Date(msg.time), // Используем время из запроса
      }),
    );

    await this.messageRepository.save(messages);

    return { chatId: savedChat.id, updated: false };
  }

  /**
   * Обновление существующего чата
   * 
   * Обновляет:
   * - phone, name, projectType (если новые значения лучше)
   * - metrics (пересчитываются на основе всех сообщений)
   * - messageCount (на основе всех сообщений)
   * - updated_at (на текущее время)
   * - messages (удаляет старые, добавляет все новые)
   */
  private async updateExistingChat(createChatDto: CreateChatDto): Promise<{ chatId: string; updated: boolean }> {
    // Находим существующий чат
    const existingChat = await this.chatRepository.findOne({
      where: { id: createChatDto.chatId },
    });

    if (!existingChat) {
      throw new NotFoundException(`Chat with ID ${createChatDto.chatId} not found`);
    }

    // Обновляем поля чата (если новые значения лучше)
    // phone - обновляем, если был пустой, а теперь есть
    if (!existingChat.phone && createChatDto.phone) {
      existingChat.phone = createChatDto.phone;
    } else if (createChatDto.phone) {
      existingChat.phone = createChatDto.phone; // Обновляем всегда, если передан
    }

    // name - обновляем, если был пустой, а теперь есть
    if (!existingChat.name && createChatDto.name) {
      existingChat.name = createChatDto.name;
    } else if (createChatDto.name) {
      existingChat.name = createChatDto.name; // Обновляем всегда, если передан
    }

    // projectType - обновляем, если был пустой, а теперь есть
    if (!existingChat.projectType && createChatDto.projectType) {
      existingChat.projectType = createChatDto.projectType;
    } else if (createChatDto.projectType) {
      existingChat.projectType = createChatDto.projectType; // Обновляем всегда, если передан
    }

    // Обновляем метрики на основе всех сообщений
    existingChat.messageCount = createChatDto.messages.length;
    existingChat.hasPriceObjection = createChatDto.metrics?.hasPriceObjection || false;
    existingChat.hasNegativeResponse = createChatDto.metrics?.hasNegativeResponse || false;
    existingChat.hasName = createChatDto.metrics?.hasName || false;
    existingChat.askedForContact = createChatDto.metrics?.askedForContact || false;
    existingChat.hasUncertainty = createChatDto.metrics?.hasUncertainty || false;
    existingChat.uncertaintyCount = createChatDto.metrics?.uncertaintyCount || 0;

    // Обновляем язык, если передан
    if (createChatDto.language) {
      existingChat.language = createChatDto.language;
    }

    // updated_at обновится автоматически благодаря @UpdateDateColumn
    await this.chatRepository.save(existingChat);

    // Удаляем старые сообщения
    await this.messageRepository.delete({ chatId: existingChat.id });

    // Добавляем все новые сообщения (полный список из запроса)
    const messages = createChatDto.messages.map((msg) =>
      this.messageRepository.create({
        chatId: existingChat.id,
        sender: msg.sender,
        text: msg.text,
        createdAt: new Date(msg.time),
      }),
    );

    await this.messageRepository.save(messages);

    return { chatId: existingChat.id, updated: true };
  }

  /**
   * Получение списка чатов с фильтрацией и пагинацией
   * 
   * Поддерживает:
   * - Фильтрацию по статусу, дате, наличию телефона/имени
   * - Поиск по имени, телефону, типу проекта
   * - Сортировку по дате создания, обновления или количеству сообщений
   * - Пагинацию
   */
  async getChats(query: GetChatsQueryDto) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = SortBy.CREATED_AT,
      sortOrder = 'desc',
      dateFrom,
      dateTo,
      hasPhone,
      hasName,
    } = query;

    const skip = (page - 1) * limit;
    const queryBuilder = this.chatRepository.createQueryBuilder('chat');

    // Применяем фильтры
    if (status) {
      queryBuilder.andWhere('chat.status = :status', { status });
    }

    if (hasPhone !== undefined) {
      if (hasPhone) {
        queryBuilder.andWhere('chat.phone IS NOT NULL');
      } else {
        queryBuilder.andWhere('chat.phone IS NULL');
      }
    }

    if (hasName !== undefined) {
      queryBuilder.andWhere('chat.hasName = :hasName', { hasName });
    }

    // Фильтр по дате
    if (dateFrom && dateTo) {
      queryBuilder.andWhere('chat.created_at BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      });
    } else if (dateFrom) {
      queryBuilder.andWhere('chat.created_at >= :dateFrom', { dateFrom });
    } else if (dateTo) {
      queryBuilder.andWhere('chat.created_at <= :dateTo', { dateTo });
    }

    // Поиск по имени, телефону или типу проекта
    if (search) {
      queryBuilder.andWhere(
        '(chat.name ILIKE :search OR chat.phone ILIKE :search OR chat.project_type ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Сортировка (используем реальные имена колонок из БД - snake_case)
    const sortColumnMap: Record<SortBy, string> = {
      [SortBy.CREATED_AT]: 'chat.created_at',
      [SortBy.UPDATED_AT]: 'chat.updated_at',
      [SortBy.MESSAGE_COUNT]: 'chat.message_count',
      [SortBy.NAME]: 'chat.name',
      [SortBy.PHONE]: 'chat.phone',
      [SortBy.STATUS]: 'chat.status',
    };

    const sortColumn = sortColumnMap[sortBy] || 'chat.created_at';

    // Для полей с возможными NULL значениями (name, phone) добавляем обработку
    if (sortBy === SortBy.NAME || sortBy === SortBy.PHONE) {
      // NULL значения будут в конце при ASC и в начале при DESC
      queryBuilder.orderBy(
        `CASE WHEN ${sortColumn} IS NULL THEN 1 ELSE 0 END`,
        'ASC',
      );
      queryBuilder.addOrderBy(sortColumn, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    } else {
      queryBuilder.orderBy(sortColumn, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    }

    // Применяем пагинацию
    queryBuilder.skip(skip).take(limit);

    // Получаем чаты и общее количество
    const [chats, total] = await queryBuilder.getManyAndCount();

    // Получаем последние сообщения для всех чатов одним запросом
    const chatIds = chats.map((chat) => chat.id);
    const lastMessageMap = new Map<string, ChatMessage>();

    if (chatIds.length > 0) {
      // Получаем все сообщения для этих чатов, отсортированные по дате (новые первыми)
      const allMessages = await this.messageRepository.find({
        where: chatIds.map((id) => ({ chatId: id })),
        order: { createdAt: 'DESC' },
      });

      // Берем первое сообщение для каждого чата (самое последнее)
      allMessages.forEach((msg) => {
        if (!lastMessageMap.has(msg.chatId)) {
          lastMessageMap.set(msg.chatId, msg);
        }
      });
    }

    // Форматируем ответ для фронтенда
    const formattedChats = chats.map((chat) => {
      const lastMessage = lastMessageMap.get(chat.id);

      return {
        id: chat.id,
        createdAt: chat.createdAt.toISOString(),
        updatedAt: chat.updatedAt.toISOString(),
        phone: chat.phone,
        name: chat.name,
        projectType: chat.projectType,
        messageCount: chat.messageCount,
        status: chat.status,
        hasPriceObjection: chat.hasPriceObjection,
        hasNegativeResponse: chat.hasNegativeResponse,
        hasName: chat.hasName,
        askedForContact: chat.askedForContact,
        language: chat.language,
        lastMessage: lastMessage
          ? {
              text: lastMessage.text,
              sender: lastMessage.sender,
              time: lastMessage.createdAt.toISOString(),
            }
          : undefined,
      };
    });

    return {
      chats: formattedChats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Получение детальной информации о чате по ID
   * Включает все сообщения чата, отсортированные по времени
   */
  async getChatById(id: string) {
    const chat = await this.chatRepository.findOne({
      where: { id },
      relations: ['messages'], // Загружаем связанные сообщения
    });

    if (!chat) {
      throw new NotFoundException(`Chat with ID ${id} not found`);
    }

    // Сортируем сообщения по дате создания (от старых к новым)
    chat.messages.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    return {
      id: chat.id,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
      phone: chat.phone,
      name: chat.name,
      projectType: chat.projectType,
      status: chat.status,
      notes: chat.notes, // Заметки админа
      metrics: {
        messageCount: chat.messageCount,
        hasPriceObjection: chat.hasPriceObjection,
        hasNegativeResponse: chat.hasNegativeResponse,
        hasName: chat.hasName,
        askedForContact: chat.askedForContact,
        hasUncertainty: chat.hasUncertainty,
        uncertaintyCount: chat.uncertaintyCount,
      },
      language: chat.language,
      messages: chat.messages.map((msg) => ({
        id: msg.id,
        sender: msg.sender,
        text: msg.text,
        createdAt: msg.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Обновление статуса или заметок чата
   * Используется в админке для управления чатами
   */
  async updateChat(id: string, updateChatDto: UpdateChatDto) {
    const chat = await this.chatRepository.findOne({ where: { id } });

    if (!chat) {
      throw new NotFoundException(`Chat with ID ${id} not found`);
    }

    // Обновляем только переданные поля
    if (updateChatDto.status) {
      chat.status = updateChatDto.status;
    }

    if (updateChatDto.notes !== undefined) {
      chat.notes = updateChatDto.notes;
    }

    await this.chatRepository.save(chat);
  }

  /**
   * Получение статистики по чатам
   * Используется для дашборда админки
   * Оптимизировано: запросы выполняются группами, чтобы не перегружать пул соединений
   */
  async getStats() {
    // Вычисляем даты заранее
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Группа 1: Основные счетчики (выполняем параллельно)
    const [total, statusCounts, projectTypeCounts, avgMessageCountResult] = await Promise.all([
      this.chatRepository.count(),
      this.chatRepository
        .createQueryBuilder('chat')
        .select('chat.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('chat.status')
        .getRawMany(),
      this.chatRepository
        .createQueryBuilder('chat')
        .select('chat.project_type', 'projectType')
        .addSelect('COUNT(*)', 'count')
        .where('chat.project_type IS NOT NULL')
        .groupBy('chat.project_type')
        .getRawMany(),
      this.chatRepository
        .createQueryBuilder('chat')
        .select('AVG(chat.message_count)', 'avg')
        .getRawOne(),
    ]);

    // Группа 2: Статистика по контактам (выполняем параллельно)
    const [withPhone, withName, withBoth] = await Promise.all([
      this.chatRepository.count({
        where: { phone: Not(IsNull()) },
      }),
      this.chatRepository.count({
        where: { hasName: true },
      }),
      this.chatRepository.count({
        where: { phone: Not(IsNull()), hasName: true },
      }),
    ]);

    // Группа 3: Метрики (выполняем параллельно)
    const [priceObjections, negativeResponses, uncertaintyCount] = await Promise.all([
      this.chatRepository.count({
        where: { hasPriceObjection: true },
      }),
      this.chatRepository.count({
        where: { hasNegativeResponse: true },
      }),
      this.chatRepository.count({
        where: { hasUncertainty: true },
      }),
    ]);

    // Группа 4: Активность за периоды (выполняем параллельно)
    const [last24hCount, last7daysCount, last30daysCount] = await Promise.all([
      this.chatRepository.count({
        where: { createdAt: Between(last24h, now) },
      }),
      this.chatRepository.count({
        where: { createdAt: Between(last7days, now) },
      }),
      this.chatRepository.count({
        where: { createdAt: Between(last30days, now) },
      }),
    ]);

    // Обрабатываем результаты
    const byStatus: Record<string, number> = {};
    statusCounts.forEach((item) => {
      byStatus[item.status] = parseInt(item.count);
    });

    const byProjectType: Record<string, number> = {};
    projectTypeCounts.forEach((item) => {
      byProjectType[item.projectType] = parseInt(item.count);
    });

    const uncertaintyRate =
      total > 0 ? (uncertaintyCount / total) * 100 : 0;

    return {
      total,
      byStatus,
      byProjectType,
      withContact: {
        withPhone,
        withName,
        withBoth,
      },
      metrics: {
        avgMessageCount: parseFloat(avgMessageCountResult?.avg || '0') || 0,
        priceObjections,
        negativeResponses,
        uncertaintyRate: parseFloat(uncertaintyRate.toFixed(2)),
      },
      recentActivity: {
        last24h: last24hCount,
        last7days: last7daysCount,
        last30days: last30daysCount,
      },
    };
  }
}
