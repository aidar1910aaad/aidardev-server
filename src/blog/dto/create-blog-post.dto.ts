import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsArray, IsDateString, IsInt, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MultilingualTextDto {
  @ApiProperty({ description: 'Текст на русском' })
  @IsString()
  @IsNotEmpty()
  ru: string;

  @ApiProperty({ description: 'Текст на английском' })
  @IsString()
  @IsNotEmpty()
  en: string;

  @ApiProperty({ description: 'Текст на казахском' })
  @IsString()
  @IsNotEmpty()
  kz: string;
}

class MultilingualArrayDto {
  @ApiProperty({ description: 'Массив на русском', type: [String] })
  @IsArray()
  @IsString({ each: true })
  ru: string[];

  @ApiProperty({ description: 'Массив на английском', type: [String] })
  @IsArray()
  @IsString({ each: true })
  en: string[];

  @ApiProperty({ description: 'Массив на казахском', type: [String] })
  @IsArray()
  @IsString({ each: true })
  kz: string[];
}

export class CreateBlogPostDto {
  @ApiProperty({ description: 'URL-friendly идентификатор (slug)' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ description: 'Заголовок на всех языках', type: MultilingualTextDto })
  @ValidateNested()
  @Type(() => MultilingualTextDto)
  title: MultilingualTextDto;

  @ApiProperty({ description: 'Мета-описание для SEO', type: MultilingualTextDto })
  @ValidateNested()
  @Type(() => MultilingualTextDto)
  description: MultilingualTextDto;

  @ApiProperty({ description: 'Краткое описание для карточки', type: MultilingualTextDto })
  @ValidateNested()
  @Type(() => MultilingualTextDto)
  excerpt: MultilingualTextDto;

  @ApiProperty({ description: 'Категория', type: MultilingualTextDto })
  @ValidateNested()
  @Type(() => MultilingualTextDto)
  category: MultilingualTextDto;

  @ApiProperty({ description: 'Дата публикации (YYYY-MM-DD)', example: '2024-01-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Ключевые слова', type: MultilingualArrayDto, required: false })
  @ValidateNested()
  @Type(() => MultilingualArrayDto)
  @IsOptional()
  keywords?: MultilingualArrayDto;

  @ApiProperty({ description: 'Время чтения в минутах', minimum: 1, maximum: 60, default: 5 })
  @IsInt()
  @Min(1)
  @Max(60)
  @IsOptional()
  readingTime?: number;

  @ApiProperty({ description: 'Опубликован ли пост', default: false })
  @IsBoolean()
  @IsOptional()
  published?: boolean;

  @ApiProperty({ description: 'Полный HTML контент', type: MultilingualTextDto, required: false })
  @ValidateNested()
  @Type(() => MultilingualTextDto)
  @IsOptional()
  content?: MultilingualTextDto;
}

