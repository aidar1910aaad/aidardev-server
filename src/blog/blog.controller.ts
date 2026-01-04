import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { BlogService } from './blog.service';
import { GeminiService } from './gemini.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';

/**
 * Контроллер для работы с блог-постами
 * Все эндпоинты доступны по префиксу /api/blog
 */
@ApiTags('blog')
@Controller('api/blog')
export class BlogController {
  constructor(
    private readonly blogService: BlogService,
    private readonly geminiService: GeminiService,
  ) {}

  /**
   * GET /api/blog/posts
   * Получить все опубликованные посты
   */
  @Get('posts')
  @ApiOperation({ summary: 'Получить все опубликованные посты' })
  @ApiQuery({
    name: 'published',
    required: false,
    type: Boolean,
    description: 'Только опубликованные посты (по умолчанию true)',
  })
  @ApiResponse({
    status: 200,
    description: 'Список постов успешно получен',
    schema: {
      type: 'object',
      properties: {
        posts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              slug: { type: 'string' },
              title: { type: 'object' },
              description: { type: 'object' },
              excerpt: { type: 'object' },
              category: { type: 'object' },
              date: { type: 'string' },
              keywords: { type: 'object', nullable: true },
              readingTime: { type: 'number' },
              published: { type: 'boolean' },
              content: { type: 'object', nullable: true },
            },
          },
        },
      },
    },
  })
  async getAllPosts(@Query('published') published?: string) {
    const publishedOnly = published !== 'false'; // По умолчанию true
    const posts = await this.blogService.getAllPosts(publishedOnly);

    return {
      posts,
    };
  }

  /**
   * GET /api/blog/posts/:slug
   * Получить пост по slug
   */
  @Get('posts/:slug')
  @ApiOperation({ summary: 'Получить пост по slug' })
  @ApiParam({ name: 'slug', description: 'URL-friendly идентификатор поста' })
  @ApiResponse({
    status: 200,
    description: 'Пост успешно получен',
    schema: {
      type: 'object',
      properties: {
        post: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            slug: { type: 'string' },
            title: { type: 'object' },
            description: { type: 'object' },
            excerpt: { type: 'object' },
            category: { type: 'object' },
            date: { type: 'string' },
            keywords: { type: 'object', nullable: true },
            readingTime: { type: 'number' },
            published: { type: 'boolean' },
            content: { type: 'object', nullable: true },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Пост не найден' })
  async getPostBySlug(@Param('slug') slug: string) {
    const post = await this.blogService.getPostBySlug(slug);
    return {
      post,
    };
  }

  /**
   * POST /api/blog/posts
   * Создать новый пост
   */
  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать новый пост' })
  @ApiResponse({ status: 201, description: 'Пост успешно создан' })
  @ApiResponse({ status: 400, description: 'Ошибка валидации или slug уже существует' })
  async createPost(@Body() createBlogPostDto: CreateBlogPostDto) {
    const post = await this.blogService.createPost(createBlogPostDto);
    return {
      success: true,
      post,
      message: 'Post created successfully',
    };
  }

  /**
   * PATCH /api/blog/posts/:slug
   * Обновить пост
   */
  @Patch('posts/:slug')
  @ApiOperation({ summary: 'Обновить пост' })
  @ApiParam({ name: 'slug', description: 'URL-friendly идентификатор поста' })
  @ApiResponse({ status: 200, description: 'Пост успешно обновлен' })
  @ApiResponse({ status: 404, description: 'Пост не найден' })
  @ApiResponse({ status: 400, description: 'Ошибка валидации' })
  async updatePost(
    @Param('slug') slug: string,
    @Body() updateBlogPostDto: UpdateBlogPostDto,
  ) {
    const post = await this.blogService.updatePost(slug, updateBlogPostDto);
    return {
      success: true,
      post,
      message: 'Post updated successfully',
    };
  }

  /**
   * DELETE /api/blog/posts/:slug
   * Удалить пост
   */
  @Delete('posts/:slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить пост' })
  @ApiParam({ name: 'slug', description: 'URL-friendly идентификатор поста' })
  @ApiResponse({ status: 200, description: 'Пост успешно удален' })
  @ApiResponse({ status: 404, description: 'Пост не найден' })
  async deletePost(@Param('slug') slug: string) {
    return await this.blogService.deletePost(slug);
  }

  /**
   * POST /api/blog/generate/auto
   * Автоматически сгенерировать статью (без параметров - тема генерируется автоматически)
   */
  @Post('generate/auto')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Автоматически сгенерировать статью (тема генерируется AI)',
  })
  @ApiQuery({
    name: 'language',
    required: false,
    enum: ['ru', 'en', 'kz'],
    description: 'Язык генерации',
  })
  @ApiQuery({
    name: 'autoSave',
    required: false,
    type: Boolean,
    description: 'Автоматически сохранить статью в БД',
  })
  @ApiResponse({
    status: 200,
    description: 'Статья успешно сгенерирована',
  })
  async generateAutoPost(
    @Query('language') language: 'ru' | 'en' | 'kz' = 'ru',
    @Query('autoSave') autoSave?: string,
  ) {
    const lang = language || 'ru';
    const shouldSave = autoSave === 'true' || autoSave === '1';

    // Получаем список существующих статей для избежания дубликатов
    const existingPosts = await this.blogService.getExistingPostsList(lang);

    // Генерируем тему автоматически (делаем до 3 попыток для избежания дубликатов)
    let topic = '';
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      topic = await this.geminiService.generateTopic(lang, existingPosts);
      
      // Проверяем, нет ли похожей темы в существующих статьях
      const isDuplicate = existingPosts.some((post) => {
        const existingTitle = post.title.toLowerCase();
        const newTopic = topic.toLowerCase();
        // Проверяем похожесть (если больше 50% слов совпадают)
        const existingWords = existingTitle.split(/\s+/);
        const newWords = newTopic.split(/\s+/);
        const commonWords = existingWords.filter((word) =>
          newWords.includes(word) && word.length > 3,
        );
        return commonWords.length / Math.max(existingWords.length, newWords.length) > 0.5;
      });
      
      if (!isDuplicate) {
        break; // Тема уникальна, выходим из цикла
      }
      
      attempts++;
    }

    // Генерируем статью на сгенерированную тему
    const generatedContent = await this.geminiService.generateBlogPost(
      topic,
      lang,
      existingPosts,
    );

    // Если autoSave = true, сохраняем в БД
    if (shouldSave) {
      const createdPost = await this.blogService.createPost(generatedContent);
      return {
        success: true,
        post: createdPost,
        topic,
        message: 'Post generated and saved successfully',
      };
    }

    // Иначе просто возвращаем сгенерированный контент
    return {
      success: true,
      post: generatedContent,
      topic,
      message: 'Post generated successfully (not saved)',
    };
  }

  /**
   * POST /api/blog/generate
   * Сгенерировать статью с помощью AI (Gemini) на заданную тему
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Сгенерировать статью с помощью AI (Gemini)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Тема статьи (например: "Как увеличить конверсию сайта")',
          example: 'Как увеличить конверсию сайта',
        },
        language: {
          type: 'string',
          enum: ['ru', 'en', 'kz'],
          description: 'Язык генерации',
          default: 'ru',
        },
        autoSave: {
          type: 'boolean',
          description: 'Автоматически сохранить статью в БД',
          default: false,
        },
      },
      required: ['topic'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Статья успешно сгенерирована',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        post: { type: 'object' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Ошибка генерации или валидации' })
  async generatePost(
    @Body('topic') topic: string,
    @Body('language') language: 'ru' | 'en' | 'kz' = 'ru',
    @Body('autoSave') autoSave: boolean = false,
  ) {
    if (!topic || topic.trim().length === 0) {
      throw new BadRequestException('Topic is required');
    }

    // Получаем список существующих статей для избежания дубликатов
    const existingPosts = await this.blogService.getExistingPostsList(
      language || 'ru',
    );

    // Генерируем статью через Gemini, передавая список существующих статей
    const generatedContent = await this.geminiService.generateBlogPost(
      topic.trim(),
      language || 'ru',
      existingPosts,
    );

    // Если autoSave = true, сохраняем в БД
    if (autoSave) {
      const createdPost = await this.blogService.createPost(generatedContent);
      return {
        success: true,
        post: createdPost,
        message: 'Post generated and saved successfully',
      };
    }

    // Иначе просто возвращаем сгенерированный контент
    return {
      success: true,
      post: generatedContent,
      message: 'Post generated successfully (not saved)',
    };
  }
}

