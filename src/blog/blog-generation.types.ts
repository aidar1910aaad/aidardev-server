export type BlogLanguage = 'ru' | 'kz';

export interface LocalizedText {
  ru: string;
  en: string;
  kz: string;
}

export interface LocalizedKeywords {
  ru: string[];
  en: string[];
  kz: string[];
}

export interface ExistingBlogPost {
  slug: string;
  title: string;
  category: string;
  keywords: string[];
}

export interface TopicCluster {
  id: string;
  service: string;
  category: { ru: string; kz: string };
  intent: string;
  city: string;
  keywords: string[];
  servicePath: string;
}

export interface GeneratedBlogPost {
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  excerpt: LocalizedText;
  category: LocalizedText;
  date: string;
  keywords: LocalizedKeywords;
  readingTime: number;
  published: boolean;
  content: LocalizedText;
}

export interface QualityReport {
  passed: boolean;
  errors: string[];
}
