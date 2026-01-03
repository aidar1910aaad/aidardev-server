# Руководство для фронтендера

## Базовый URL
```
http://localhost:3001/api
```

## Эндпоинты

### 1. Сохранение чата
**POST** `/api/chats`

**Когда вызывать:**
- Через 2 минуты после последнего сообщения
- При закрытии чата (если есть сообщения)
- Только если сообщений > 1 (не сохраняет только приветствие)
- Один раз за сессию (используйте флаг `isDialogSaved`)

**Request Body:**
```typescript
{
  timestamp: string; // ISO string, время начала/сохранения чата
  phone?: string; // Извлечен из сообщений (regex: /(\+?7|8)?[\s\-]?\(?(\d{3})\)?[\s\-]?(\d{3})[\s\-]?(\d{2})[\s\-]?(\d{2})/)
  name?: string; // Извлечен из сообщений (паттерны: "меня зовут X", "я X", "это X")
  projectType?: string; // Извлечен из сообщений (ключевые слова: лендинг, сайт, бот, etc.)
  messages: Array<{
    sender: 'bot' | 'user'; // Тип отправителя
    text: string; // Текст сообщения
    time: string; // ISO string, время отправки
  }>;
  metrics?: {
    messageCount: number; // Общее количество сообщений
    hasPriceObjection: boolean; // Есть возражения по цене (дорого, много, не по карману)
    hasNegativeResponse: boolean; // Негативный ответ (не интересно, не нужно)
    hasName: boolean; // Клиент назвал имя
    askedForContact: boolean; // Бот запросил контакт (номер, телефон, созвонимся)
    hasUncertainty: boolean; // Неопределенность (не знаю, не уверен)
    uncertaintyCount: number; // Количество "не знаю"
  };
  language?: string; // 'ru' | 'en' | 'kz' - язык интерфейса
  userAgent?: string; // User-Agent браузера (опционально, определяется автоматически)
  ipAddress?: string; // IP адрес (опционально, определяется автоматически)
}
```

**Response:**
```typescript
{
  success: boolean;
  chatId?: string; // UUID чата (если успешно)
  message?: string; // Сообщение об ошибке или успехе
}
```

**Пример запроса:**
```typescript
const response = await fetch('http://localhost:3001/api/chats', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    timestamp: new Date().toISOString(),
    phone: '+77001234567',
    name: 'Иван',
    projectType: 'лендинг',
    messages: [
      { sender: 'bot', text: 'Привет!', time: '2024-01-15T10:30:00.000Z' },
      { sender: 'user', text: 'Здравствуйте', time: '2024-01-15T10:30:05.000Z' },
    ],
    metrics: {
      messageCount: 2,
      hasPriceObjection: false,
      hasNegativeResponse: false,
      hasName: true,
      askedForContact: false,
      hasUncertainty: false,
      uncertaintyCount: 0,
    },
    language: 'ru',
  }),
});

const data = await response.json();
```

---

### 2. Получить список чатов
**GET** `/api/chats`

**Query параметры:**
- `page` (number, default: 1) - номер страницы
- `limit` (number, default: 20, max: 100) - количество на странице
- `status` (string, optional) - фильтр по статусу: 'new', 'contacted', 'in_progress', 'completed', 'archived'
- `search` (string, optional) - поиск по name, phone, projectType
- `sortBy` (string, default: 'created_at') - поле сортировки: 'created_at', 'updated_at', 'message_count'
- `sortOrder` (string, default: 'desc') - порядок сортировки: 'asc', 'desc'
- `dateFrom` (string, optional) - дата начала периода (ISO 8601)
- `dateTo` (string, optional) - дата окончания периода (ISO 8601)
- `hasPhone` (boolean, optional) - только чаты с телефоном
- `hasName` (boolean, optional) - только чаты с именем

**Response:**
```typescript
{
  success: boolean;
  data: {
    chats: Array<{
      id: string;
      createdAt: string;
      updatedAt: string;
      phone?: string;
      name?: string;
      projectType?: string;
      messageCount: number;
      status: string;
      hasPriceObjection: boolean;
      hasNegativeResponse: boolean;
      hasName: boolean;
      askedForContact: boolean;
      language: string;
      lastMessage?: {
        text: string;
        sender: 'bot' | 'user';
        time: string;
      };
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
```

**Пример запроса:**
```typescript
const params = new URLSearchParams({
  page: '1',
  limit: '20',
  status: 'new',
  search: 'Иван',
  sortBy: 'created_at',
  sortOrder: 'desc',
});

const response = await fetch(`http://localhost:3001/api/chats?${params}`);
const data = await response.json();
```

---

### 3. Получить детали чата
**GET** `/api/chats/:id`

**Response:**
```typescript
{
  success: boolean;
  data: {
    id: string;
    createdAt: string;
    updatedAt: string;
    phone?: string;
    name?: string;
    projectType?: string;
    status: string;
    notes?: string; // Заметки админа
    metrics: {
      messageCount: number;
      hasPriceObjection: boolean;
      hasNegativeResponse: boolean;
      hasName: boolean;
      askedForContact: boolean;
      hasUncertainty: boolean;
      uncertaintyCount: number;
    };
    language: string;
    messages: Array<{
      id: string;
      sender: 'bot' | 'user';
      text: string;
      createdAt: string;
    }>;
  };
}
```

**Пример запроса:**
```typescript
const chatId = 'uuid-чата';
const response = await fetch(`http://localhost:3001/api/chats/${chatId}`);
const data = await response.json();
```

---

### 4. Обновить статус или заметки чата
**PATCH** `/api/chats/:id`

**Request Body:**
```typescript
{
  status?: 'new' | 'contacted' | 'in_progress' | 'completed' | 'archived';
  notes?: string; // Заметки админа (max 5000 символов)
}
```

**Response:**
```typescript
{
  success: boolean;
  message?: string;
}
```

**Пример запроса:**
```typescript
const chatId = 'uuid-чата';
const response = await fetch(`http://localhost:3001/api/chats/${chatId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    status: 'contacted',
    notes: 'Клиент заинтересован в лендинге',
  }),
});

const data = await response.json();
```

---

### 5. Получить статистику
**GET** `/api/chats/stats`

**Response:**
```typescript
{
  success: boolean;
  data: {
    total: number;
    byStatus: Record<string, number>;
    byProjectType: Record<string, number>;
    withContact: {
      withPhone: number;
      withName: number;
      withBoth: number;
    };
    metrics: {
      avgMessageCount: number;
      priceObjections: number;
      negativeResponses: number;
      uncertaintyRate: number; // % чатов с неопределенностью
    };
    recentActivity: {
      last24h: number;
      last7days: number;
      last30days: number;
    };
  };
}
```

**Пример запроса:**
```typescript
const response = await fetch('http://localhost:3001/api/chats/stats');
const data = await response.json();
```

---

## Важные моменты

### Валидация на фронтенде
1. **Минимум 2 сообщения** - не сохраняйте чат, если только одно сообщение (приветствие)
2. **Один раз за сессию** - используйте флаг `isDialogSaved`, чтобы не сохранять дважды
3. **Извлечение данных** - phone, name, projectType извлекаются на фронтенде до отправки
4. **Метрики** - собираются на фронтенде и передаются готовыми

### Обработка ошибок
Все эндпоинты возвращают объект с полем `success`:
- `success: true` - запрос выполнен успешно
- `success: false` - произошла ошибка, проверьте поле `message`

### CORS
Сервер настроен на работу только с доменами `aidardev.kz` и его поддоменами. Для локальной разработки может потребоваться настройка CORS.

### Swagger документация
Полная документация API доступна по адресу:
```
http://localhost:3001/api/docs
```

---

## Примеры использования

### Сохранение чата после закрытия
```typescript
async function saveChatOnClose(messages: Message[], metrics: Metrics) {
  // Проверяем, что чат еще не сохранен
  if (isDialogSaved) return;
  
  // Проверяем, что есть минимум 2 сообщения
  if (messages.length < 2) return;
  
  // Извлекаем данные из сообщений
  const phone = extractPhone(messages);
  const name = extractName(messages);
  const projectType = extractProjectType(messages);
  
  try {
    const response = await fetch('http://localhost:3001/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        phone,
        name,
        projectType,
        messages: messages.map(msg => ({
          sender: msg.sender,
          text: msg.text,
          time: msg.time.toISOString(),
        })),
        metrics,
        language: 'ru',
      }),
    });
    
    const data = await response.json();
    if (data.success) {
      isDialogSaved = true; // Помечаем как сохраненный
      console.log('Chat saved:', data.chatId);
    }
  } catch (error) {
    console.error('Failed to save chat:', error);
  }
}
```

### Получение списка чатов с фильтрацией
```typescript
async function getChats(filters: {
  page?: number;
  status?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', filters.page.toString());
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  
  const response = await fetch(`http://localhost:3001/api/chats?${params}`);
  const data = await response.json();
  
  if (data.success) {
    return data.data;
  } else {
    throw new Error(data.message);
  }
}
```

---

## Структура данных

### Статусы чата
- `new` - новый чат
- `contacted` - связались с клиентом
- `in_progress` - в работе
- `completed` - завершен
- `archived` - архивирован

### Типы отправителей сообщений
- `bot` - сообщение от бота
- `user` - сообщение от пользователя

### Языки
- `ru` - русский
- `en` - английский
- `kz` - казахский



