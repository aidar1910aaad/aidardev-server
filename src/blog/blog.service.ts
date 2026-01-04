import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogPost } from '../entities/blog-post.entity';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';

/**
 * Сервис для работы с блог-постами
 */
@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost)
    private blogPostRepository: Repository<BlogPost>,
  ) {}

  /**
   * Получить все опубликованные посты
   * Сортировка: новые первые
   */
  async getAllPosts(publishedOnly: boolean = true) {
    const queryBuilder = this.blogPostRepository.createQueryBuilder('post');

    if (publishedOnly) {
      queryBuilder.where('post.published = :published', { published: true });
    }

    queryBuilder.orderBy('post.date', 'DESC').addOrderBy('post.createdAt', 'DESC');

    const posts = await queryBuilder.getMany();

    return posts.map((post) => this.formatPost(post));
  }

  /**
   * Получить пост по slug
   */
  async getPostBySlug(slug: string, publishedOnly: boolean = true) {
    const queryBuilder = this.blogPostRepository
      .createQueryBuilder('post')
      .where('post.slug = :slug', { slug });

    if (publishedOnly) {
      queryBuilder.andWhere('post.published = :published', { published: true });
    }

    const post = await queryBuilder.getOne();

    if (!post) {
      throw new NotFoundException(`Blog post with slug "${slug}" not found`);
    }

    return this.formatPost(post);
  }

  /**
   * Создать новый пост
   */
  async createPost(createBlogPostDto: CreateBlogPostDto) {
    // Проверяем, существует ли пост с таким slug
    const existingPost = await this.blogPostRepository.findOne({
      where: { slug: createBlogPostDto.slug },
    });

    if (existingPost) {
      throw new BadRequestException(
        `Blog post with slug "${createBlogPostDto.slug}" already exists`,
      );
    }

    // Преобразуем дату: если это строка YYYY-MM-DD, используем как есть (TypeORM сам конвертирует)
    // Если нужно сохранить как Date, TypeORM автоматически преобразует строку в date тип
    const post = this.blogPostRepository.create({
      slug: createBlogPostDto.slug,
      title: createBlogPostDto.title,
      description: createBlogPostDto.description,
      excerpt: createBlogPostDto.excerpt,
      category: createBlogPostDto.category,
      date: createBlogPostDto.date, // TypeORM автоматически конвертирует строку YYYY-MM-DD в date
      keywords: createBlogPostDto.keywords || null,
      readingTime: createBlogPostDto.readingTime || 5,
      published: createBlogPostDto.published || false,
      content: createBlogPostDto.content || null,
    });

    const savedPost = await this.blogPostRepository.save(post);
    return this.formatPost(savedPost);
  }

  /**
   * Обновить пост
   */
  async updatePost(slug: string, updateBlogPostDto: UpdateBlogPostDto) {
    const post = await this.blogPostRepository.findOne({
      where: { slug },
    });

    if (!post) {
      throw new NotFoundException(`Blog post with slug "${slug}" not found`);
    }

    // Если меняется slug, проверяем что новый slug не занят
    if (updateBlogPostDto.slug && updateBlogPostDto.slug !== slug) {
      const existingPost = await this.blogPostRepository.findOne({
        where: { slug: updateBlogPostDto.slug },
      });

      if (existingPost) {
        throw new BadRequestException(
          `Blog post with slug "${updateBlogPostDto.slug}" already exists`,
        );
      }
    }

    // Обновляем поля
    if (updateBlogPostDto.title) post.title = updateBlogPostDto.title;
    if (updateBlogPostDto.description) post.description = updateBlogPostDto.description;
    if (updateBlogPostDto.excerpt) post.excerpt = updateBlogPostDto.excerpt;
    if (updateBlogPostDto.category) post.category = updateBlogPostDto.category;
    if (updateBlogPostDto.date) {
      // TypeORM конвертирует строку YYYY-MM-DD в date тип PostgreSQL
      post.date = updateBlogPostDto.date as any;
    }
    if (updateBlogPostDto.keywords !== undefined) post.keywords = updateBlogPostDto.keywords || null;
    if (updateBlogPostDto.readingTime !== undefined) post.readingTime = updateBlogPostDto.readingTime;
    if (updateBlogPostDto.published !== undefined) post.published = updateBlogPostDto.published;
    if (updateBlogPostDto.content !== undefined) post.content = updateBlogPostDto.content || null;
    if (updateBlogPostDto.slug) post.slug = updateBlogPostDto.slug;

    const updatedPost = await this.blogPostRepository.save(post);
    return this.formatPost(updatedPost);
  }

  /**
   * Удалить пост
   */
  async deletePost(slug: string) {
    const post = await this.blogPostRepository.findOne({
      where: { slug },
    });

    if (!post) {
      throw new NotFoundException(`Blog post with slug "${slug}" not found`);
    }

    await this.blogPostRepository.remove(post);
    return { success: true, message: 'Post deleted successfully' };
  }

  /**
   * Получить список существующих статей (slug и title) для проверки дубликатов
   */
  async getExistingPostsList(language: 'ru' | 'en' | 'kz' = 'ru') {
    const posts = await this.blogPostRepository.find({
      select: ['slug', 'title', 'category'],
      order: { createdAt: 'DESC' },
    });

    return posts.map((post) => ({
      slug: post.slug,
      title: post.title[language] || post.title.ru || post.title.en || '',
      category: post.category?.[language] || post.category?.ru || post.category?.en || '',
    }));
  }

  /**
   * Форматирование поста для API ответа
   */
  private formatPost(post: BlogPost) {
    // Обрабатываем date - может быть Date объектом или строкой (YYYY-MM-DD)
    // PostgreSQL тип 'date' возвращается как строка, не как Date объект
    let formattedDate: string;
    const postDate = post.date as any; // TypeORM может вернуть строку или Date
    if (postDate instanceof Date) {
      formattedDate = postDate.toISOString().split('T')[0];
    } else if (typeof postDate === 'string') {
      // Если это строка, проверяем формат
      formattedDate = postDate.split('T')[0]; // Убираем время если есть
    } else {
      // Fallback: пытаемся создать Date из значения
      formattedDate = new Date(postDate).toISOString().split('T')[0];
    }

    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      description: post.description,
      excerpt: post.excerpt,
      category: post.category,
      date: formattedDate, // YYYY-MM-DD
      keywords: post.keywords,
      readingTime: post.readingTime,
      published: post.published,
      content: post.content,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }
}

