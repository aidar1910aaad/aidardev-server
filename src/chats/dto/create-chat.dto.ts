import {
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  ValidateNested,
  IsNotEmpty,
  MinLength,
  IsISO8601,
  ArrayMinSize,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type MessageSender = 'bot' | 'user';

export class MessageDto {
  @ApiProperty({
    enum: ['bot', 'user'],
    description: 'Тип отправителя сообщения',
    example: 'user',
  })
  @IsEnum(['bot', 'user'])
  sender: MessageSender;

  @ApiProperty({
    description: 'Текст сообщения',
    example: 'Привет, меня зовут Иван',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  text: string;

  @ApiProperty({
    description: 'Время отправки сообщения (ISO 8601)',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsISO8601()
  time: string;
}

export class MetricsDto {
  @ApiProperty({ description: 'Общее количество сообщений', example: 5 })
  @IsNumber()
  messageCount: number;

  @ApiProperty({
    description: 'Есть возражения по цене',
    example: false,
  })
  @IsBoolean()
  hasPriceObjection: boolean;

  @ApiProperty({
    description: 'Негативный ответ',
    example: false,
  })
  @IsBoolean()
  hasNegativeResponse: boolean;

  @ApiProperty({
    description: 'Клиент назвал имя',
    example: true,
  })
  @IsBoolean()
  hasName: boolean;

  @ApiProperty({
    description: 'Бот запросил контакт',
    example: true,
  })
  @IsBoolean()
  askedForContact: boolean;

  @ApiProperty({
    description: 'Есть неопределенность',
    example: false,
  })
  @IsBoolean()
  hasUncertainty: boolean;

  @ApiProperty({
    description: 'Количество "не знаю"',
    example: 0,
  })
  @IsNumber()
  uncertaintyCount: number;
}

export class CreateChatDto {
  @ApiProperty({
    description: 'Время начала/сохранения чата (ISO 8601)',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsISO8601()
  @IsNotEmpty()
  timestamp: string;

  @ApiPropertyOptional({
    description: 'Номер телефона, извлеченный из сообщений',
    example: '+77001234567',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(\+?7|8)?[\s\-]?\(?(\d{3})\)?[\s\-]?(\d{3})[\s\-]?(\d{2})[\s\-]?(\d{2})$/, {
    message: 'Phone must be a valid phone number',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Имя клиента, извлеченное из сообщений',
    example: 'Иван',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Тип проекта, извлеченный из сообщений',
    example: 'лендинг',
  })
  @IsOptional()
  @IsString()
  projectType?: string;

  @ApiProperty({
    description: 'Массив сообщений (минимум 2)',
    type: [MessageDto],
    example: [
      { sender: 'bot', text: 'Привет!', time: '2024-01-15T10:30:00.000Z' },
      { sender: 'user', text: 'Здравствуйте', time: '2024-01-15T10:30:05.000Z' },
    ],
  })
  @IsArray()
  @ArrayMinSize(2, { message: 'Messages must contain at least 2 elements' })
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  @ApiPropertyOptional({
    description: 'Метрики чата',
    type: MetricsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MetricsDto)
  metrics?: MetricsDto;

  @ApiPropertyOptional({
    description: 'Язык интерфейса',
    enum: ['ru', 'en', 'kz'],
    example: 'ru',
  })
  @IsOptional()
  @IsEnum(['ru', 'en', 'kz'])
  language?: string;

  @ApiPropertyOptional({
    description: 'User-Agent браузера',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'IP адрес клиента',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;
}

