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
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { GetChatsQueryDto } from './dto/get-chats-query.dto';

@ApiTags('chats')
@Controller('api/chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Сохранение чата' })
  @ApiBody({ type: CreateChatDto })
  @ApiResponse({
    status: 200,
    description: 'Чат успешно сохранен',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        chatId: { type: 'string', example: 'uuid' },
        message: { type: 'string', example: 'Chat saved successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка валидации',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string' },
      },
    },
  })
  async createChat(@Body() createChatDto: CreateChatDto, @Req() req: Request) {
    try {
      // Получаем IP и User-Agent из запроса
      const ipAddress =
        (req.headers as any)['x-forwarded-for']?.split(',')[0] ||
        (req.headers as any)['x-real-ip'] ||
        (req as any).socket?.remoteAddress;

      const userAgent = (req.headers as any)['user-agent'];

      // Добавляем IP и User-Agent если они не переданы
      if (!createChatDto.ipAddress && ipAddress) {
        createChatDto.ipAddress = ipAddress;
      }
      if (!createChatDto.userAgent && userAgent) {
        createChatDto.userAgent = userAgent;
      }

      const { chatId } = await this.chatsService.createChat(createChatDto);

      return {
        success: true,
        chatId,
        message: 'Chat saved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to save chat',
      };
    }
  }

  @Get()
  @ApiOperation({ summary: 'Получить список чатов' })
  @ApiResponse({
    status: 200,
    description: 'Список чатов успешно получен',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            chats: { type: 'array', items: { type: 'object' } },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 20 },
                total: { type: 'number', example: 100 },
                totalPages: { type: 'number', example: 5 },
              },
            },
          },
        },
      },
    },
  })
  async getChats(@Query() query: GetChatsQueryDto) {
    try {
      const data = await this.chatsService.getChats(query);
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch chats',
      };
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику по чатам' })
  @ApiResponse({
    status: 200,
    description: 'Статистика успешно получена',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 150 },
            byStatus: { type: 'object' },
            byProjectType: { type: 'object' },
            withContact: { type: 'object' },
            metrics: { type: 'object' },
            recentActivity: { type: 'object' },
          },
        },
      },
    },
  })
  async getStats() {
    try {
      const data = await this.chatsService.getStats();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch stats',
      };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить детали чата по ID' })
  @ApiParam({ name: 'id', description: 'UUID чата' })
  @ApiResponse({
    status: 200,
    description: 'Детали чата успешно получены',
  })
  @ApiResponse({
    status: 404,
    description: 'Чат не найден',
  })
  async getChatById(@Param('id') id: string) {
    try {
      const data = await this.chatsService.getChatById(id);
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch chat',
      };
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить статус или заметки чата' })
  @ApiParam({ name: 'id', description: 'UUID чата' })
  @ApiBody({ type: UpdateChatDto })
  @ApiResponse({
    status: 200,
    description: 'Чат успешно обновлен',
  })
  @ApiResponse({
    status: 404,
    description: 'Чат не найден',
  })
  async updateChat(
    @Param('id') id: string,
    @Body() updateChatDto: UpdateChatDto,
  ) {
    try {
      await this.chatsService.updateChat(id, updateChatDto);
      return {
        success: true,
        message: 'Chat updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update chat',
      };
    }
  }
}

