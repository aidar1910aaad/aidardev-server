import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BlogApiSecretGuard } from './blog-api-secret.guard';
import { BlogGenerationService } from './blog-generation.service';
import { BlogRevalidateService } from './blog-revalidate.service';
import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';

@ApiTags('blog')
@Controller('api/blog')
export class BlogController {
  constructor(
    private readonly blogService: BlogService,
    private readonly generationService: BlogGenerationService,
    private readonly revalidateService: BlogRevalidateService,
  ) {}

  @Get('posts')
  @ApiOperation({ summary: 'Получить опубликованные посты' })
  async getAllPosts() {
    return { posts: await this.blogService.getAllPosts(true) };
  }

  @Get('posts/:slug')
  @ApiOperation({ summary: 'Получить опубликованный пост по slug' })
  async getPostBySlug(@Param('slug') slug: string) {
    return { post: await this.blogService.getPostBySlug(slug, true) };
  }

  @Post('posts')
  @UseGuards(BlogApiSecretGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  async createPost(@Body() dto: CreateBlogPostDto) {
    const post = await this.blogService.createPost(dto);
    if (post.published) await this.revalidateService.notify(post.slug);
    return {
      success: true,
      post,
      message: 'Post created successfully',
    };
  }

  @Patch('posts/:slug')
  @UseGuards(BlogApiSecretGuard)
  @ApiBearerAuth()
  async updatePost(@Param('slug') slug: string, @Body() dto: UpdateBlogPostDto) {
    const post = await this.blogService.updatePost(slug, dto);
    await this.revalidateService.notify(slug);
    if (post.slug !== slug) await this.revalidateService.notify(post.slug);
    return {
      success: true,
      post,
      message: 'Post updated successfully',
    };
  }

  @Delete('posts/:slug')
  @UseGuards(BlogApiSecretGuard)
  @ApiBearerAuth()
  async deletePost(@Param('slug') slug: string) {
    const result = await this.blogService.deletePost(slug);
    await this.revalidateService.notify(slug);
    return result;
  }

  @Post('generate/auto')
  @UseGuards(BlogApiSecretGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'autoSave', required: false, type: Boolean })
  @ApiQuery({
    name: 'language',
    required: false,
    enum: ['ru', 'kz'],
    description: 'Deprecated: generation always creates RU and KZ',
  })
  async generateAutoPost(@Query('autoSave') autoSave?: string) {
    const result = await this.generationService.generate({
      save: autoSave === 'true' || autoSave === '1',
    });
    return {
      success: true,
      ...result,
      message: result.saved
        ? 'RU+KZ post passed quality gate, was saved and published'
        : 'RU+KZ post passed quality gate (not saved)',
    };
  }

  @Post('generate')
  @UseGuards(BlogApiSecretGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async generatePost(
    @Body('topic') topic: string,
    @Body('autoSave') autoSave = false,
  ) {
    if (!topic?.trim()) throw new BadRequestException('Topic is required');
    const result = await this.generationService.generate({
      topic: topic.trim(),
      save: Boolean(autoSave),
    });
    return {
      success: true,
      ...result,
      message: result.saved
        ? 'RU+KZ post passed quality gate, was saved and published'
        : 'RU+KZ post passed quality gate (not saved)',
    };
  }

  @Post('cron/generate')
  @UseGuards(BlogApiSecretGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Идемпотентная генерация для внешнего cron' })
  @ApiQuery({ name: 'slot', required: true, enum: [1, 2, 3] })
  @ApiResponse({ status: 200, description: 'Пост опубликован или ранее создан для слота' })
  async generateCron(@Query('slot', ParseIntPipe) slot: number) {
    return { success: true, ...(await this.generationService.generateCron(slot)) };
  }
}
