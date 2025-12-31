import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { Chat } from '../entities/chat.entity';
import { ChatMessage } from '../entities/chat-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Chat, ChatMessage])],
  controllers: [ChatsController],
  providers: [ChatsService],
  exports: [ChatsService],
})
export class ChatsModule {}

