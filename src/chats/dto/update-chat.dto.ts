import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChatStatus } from '../../entities/chat.entity';

export class UpdateChatDto {
  @ApiPropertyOptional({
    description: 'Статус чата',
    enum: ChatStatus,
    example: ChatStatus.CONTACTED,
  })
  @IsOptional()
  @IsEnum(ChatStatus)
  status?: ChatStatus;

  @ApiPropertyOptional({
    description: 'Заметки админа (максимум 5000 символов)',
    example: 'Клиент заинтересован в лендинге',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Notes must not exceed 5000 characters' })
  notes?: string;
}

