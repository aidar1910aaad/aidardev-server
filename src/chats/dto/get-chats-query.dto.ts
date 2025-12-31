import {
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  IsEnum,
  IsISO8601,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SortBy {
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
  MESSAGE_COUNT = 'message_count',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetChatsQueryDto {
  @ApiPropertyOptional({
    description: 'Номер страницы',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Количество элементов на странице',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Фильтр по статусу',
    enum: ['new', 'contacted', 'in_progress', 'completed', 'archived'],
    example: 'new',
  })
  @IsOptional()
  @IsEnum(['new', 'contacted', 'in_progress', 'completed', 'archived'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Поиск по имени, телефону или типу проекта',
    example: 'Иван',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Поле для сортировки',
    enum: SortBy,
    default: SortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Порядок сортировки',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    description: 'Дата начала периода (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Дата окончания периода (ISO 8601)',
    example: '2024-01-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Только чаты с телефоном',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasPhone?: boolean;

  @ApiPropertyOptional({
    description: 'Только чаты с именем',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasName?: boolean;
}

