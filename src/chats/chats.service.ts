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

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
  ) {}

  async createChat(createChatDto: CreateChatDto): Promise<{ chatId: string }> {
    // Валидация: минимум 2 сообщения
    if (!createChatDto.messages || createChatDto.messages.length < 2) {
      throw new BadRequestException(
        'Chat must contain at least 2 messages',
      );
    }

    const chat = this.chatRepository.create({
      phone: createChatDto.phone,
      name: createChatDto.name,
      projectType: createChatDto.projectType,
      language: createChatDto.language || 'ru',
      messageCount: createChatDto.messages.length,
      hasPriceObjection: createChatDto.metrics?.hasPriceObjection || false,
      hasNegativeResponse: createChatDto.metrics?.hasNegativeResponse || false,
      hasName: createChatDto.metrics?.hasName || false,
      askedForContact: createChatDto.metrics?.askedForContact || false,
      hasUncertainty: createChatDto.metrics?.hasUncertainty || false,
      uncertaintyCount: createChatDto.metrics?.uncertaintyCount || 0,
      userAgent: createChatDto.userAgent,
      ipAddress: createChatDto.ipAddress,
      status: ChatStatus.NEW,
    });

    const savedChat = await this.chatRepository.save(chat);

    // Сохраняем сообщения
    const messages = createChatDto.messages.map((msg) =>
      this.messageRepository.create({
        chatId: savedChat.id,
        sender: msg.sender,
        text: msg.text,
        createdAt: new Date(msg.time),
      }),
    );

    await this.messageRepository.save(messages);

    return { chatId: savedChat.id };
  }

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

    if (search) {
      queryBuilder.andWhere(
        '(chat.name ILIKE :search OR chat.phone ILIKE :search OR chat.projectType ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Сортировка (используем реальные имена колонок из БД - snake_case)
    // TypeORM queryBuilder требует реальные имена колонок, а не имена свойств entity
    const sortColumn =
      sortBy === SortBy.CREATED_AT
        ? 'chat.created_at'
        : sortBy === SortBy.UPDATED_AT
          ? 'chat.updated_at'
          : 'chat.message_count';

    queryBuilder.orderBy(sortColumn, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Пагинация
    queryBuilder.skip(skip).take(limit);

    const [chats, total] = await queryBuilder.getManyAndCount();

    // Получаем последние сообщения для всех чатов
    const chatIds = chats.map((chat) => chat.id);
    const lastMessageMap = new Map();
    
    if (chatIds.length > 0) {
      // Получаем последние сообщения для каждого чата
      // Используем простой подход: получаем все сообщения и находим последнее для каждого чата
      const allMessages = await this.messageRepository.find({
        where: chatIds.map((id) => ({ chatId: id })),
        order: { createdAt: 'DESC' },
      });

      // Группируем по chatId и берем первое (самое последнее) для каждого чата
      allMessages.forEach((msg) => {
        if (!lastMessageMap.has(msg.chatId)) {
          lastMessageMap.set(msg.chatId, msg);
        }
      });
    }

    // Форматируем ответ
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

  async getChatById(id: string) {
    const chat = await this.chatRepository.findOne({
      where: { id },
      relations: ['messages'],
    });

    if (!chat) {
      throw new NotFoundException(`Chat with ID ${id} not found`);
    }

    // Сортируем сообщения по дате создания
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
      notes: chat.notes,
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

  async updateChat(id: string, updateChatDto: UpdateChatDto) {
    const chat = await this.chatRepository.findOne({ where: { id } });

    if (!chat) {
      throw new NotFoundException(`Chat with ID ${id} not found`);
    }

    if (updateChatDto.status) {
      chat.status = updateChatDto.status;
    }

    if (updateChatDto.notes !== undefined) {
      chat.notes = updateChatDto.notes;
    }

    await this.chatRepository.save(chat);

    return { success: true };
  }

  async getStats() {
    const total = await this.chatRepository.count();

    // Статистика по статусам
    const statusCounts = await this.chatRepository
      .createQueryBuilder('chat')
      .select('chat.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('chat.status')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    statusCounts.forEach((item) => {
      byStatus[item.status] = parseInt(item.count);
    });

    // Статистика по типам проектов
    const projectTypeCounts = await this.chatRepository
      .createQueryBuilder('chat')
      .select('chat.projectType', 'projectType')
      .addSelect('COUNT(*)', 'count')
      .where('chat.projectType IS NOT NULL')
      .groupBy('chat.projectType')
      .getRawMany();

    const byProjectType: Record<string, number> = {};
    projectTypeCounts.forEach((item) => {
      byProjectType[item.projectType] = parseInt(item.count);
    });

    // Контакты
    const withPhone = await this.chatRepository.count({
      where: { phone: Not(IsNull()) },
    });
    const withName = await this.chatRepository.count({
      where: { hasName: true },
    });
    const withBoth = await this.chatRepository.count({
      where: { phone: Not(IsNull()), hasName: true },
    });

    // Метрики
    const avgMessageCount = await this.chatRepository
      .createQueryBuilder('chat')
      .select('AVG(chat.messageCount)', 'avg')
      .getRawOne();

    const priceObjections = await this.chatRepository.count({
      where: { hasPriceObjection: true },
    });

    const negativeResponses = await this.chatRepository.count({
      where: { hasNegativeResponse: true },
    });

    const uncertaintyCount = await this.chatRepository.count({
      where: { hasUncertainty: true },
    });

    const uncertaintyRate =
      total > 0 ? (uncertaintyCount / total) * 100 : 0;

    // Активность
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const last24hCount = await this.chatRepository.count({
      where: { createdAt: Between(last24h, now) },
    });

    const last7daysCount = await this.chatRepository.count({
      where: { createdAt: Between(last7days, now) },
    });

    const last30daysCount = await this.chatRepository.count({
      where: { createdAt: Between(last30days, now) },
    });

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
        avgMessageCount: parseFloat(avgMessageCount?.avg || '0') || 0,
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

