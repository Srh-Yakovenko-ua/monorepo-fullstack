# Blogs, Posts, Videos — CRUD ресурсы

**Status**: active
**Last updated**: 2026-04-20
**Curator**: feature-context-curator

## Назначение

Три независимых CRUD-ресурса (блоги, посты, видео) с персистентностью в MongoDB и полным покрытием интеграционными тестами. Посты ссылаются на блоги — при создании и обновлении поста сервис резолвит `blogName` по `blogId`. Эндпоинт `DELETE /api/testing/all-data` сбрасывает все три коллекции одновременно и предназначен исключительно для тестовой изоляции.

## HTTP API

### Blogs

| Метод  | Путь             | Успех | Ошибки   | Тело запроса | Тело ответа       |
| ------ | ---------------- | ----- | -------- | ------------ | ----------------- |
| GET    | `/api/blogs`     | 200   | —        | —            | `BlogViewModel[]` |
| POST   | `/api/blogs`     | 201   | 400      | `BlogInput`  | `BlogViewModel`   |
| GET    | `/api/blogs/:id` | 200   | 404      | —            | `BlogViewModel`   |
| PUT    | `/api/blogs/:id` | 204   | 400, 404 | `BlogInput`  | —                 |
| DELETE | `/api/blogs/:id` | 204   | 404      | —            | —                 |

### Posts

| Метод  | Путь             | Успех | Ошибки   | Тело запроса | Тело ответа       |
| ------ | ---------------- | ----- | -------- | ------------ | ----------------- |
| GET    | `/api/posts`     | 200   | —        | —            | `PostViewModel[]` |
| POST   | `/api/posts`     | 201   | 400      | `PostInput`  | `PostViewModel`   |
| GET    | `/api/posts/:id` | 200   | 404      | —            | `PostViewModel`   |
| PUT    | `/api/posts/:id` | 204   | 400, 404 | `PostInput`  | —                 |
| DELETE | `/api/posts/:id` | 204   | 404      | —            | —                 |

`POST /api/posts` и `PUT /api/posts/:id` возвращают 400 с `{ errorsMessages: [{ field: "blogId", message: "blog not found" }] }` если переданный `blogId` не существует в коллекции `blogs` — это бизнес-валидация, не Zod-ошибка.

### Videos

| Метод  | Путь              | Успех | Ошибки   | Тело запроса       | Тело ответа        |
| ------ | ----------------- | ----- | -------- | ------------------ | ------------------ |
| GET    | `/api/videos`     | 200   | —        | —                  | `VideoViewModel[]` |
| POST   | `/api/videos`     | 201   | 400      | `CreateVideoInput` | `VideoViewModel`   |
| GET    | `/api/videos/:id` | 200   | 404      | —                  | `VideoViewModel`   |
| PUT    | `/api/videos/:id` | 204   | 400, 404 | `UpdateVideoInput` | —                  |
| DELETE | `/api/videos/:id` | 204   | 404      | —                  | —                  |

`id` у видео — `number` (Unix timestamp в миллисекундах на момент создания), не ObjectId.

### Testing

| Метод  | Путь                    | Успех | Ошибки | Тело запроса | Тело ответа |
| ------ | ----------------------- | ----- | ------ | ------------ | ----------- |
| DELETE | `/api/testing/all-data` | 204   | —      | —            | —           |

Swagger UI доступен на `GET /api/docs` в dev/test окружениях (`env.nodeEnv !== "production"`). Все пути зарегистрированы через `registerPaths` прямо в файлах роутеров.

## Поток данных (data flow)

Пример: `POST /api/blogs`

```
HTTP-запрос
  → apps/api/src/middleware/request-id.ts        (добавляет x-request-id)
  → apps/api/src/middleware/request-logger.ts    (pino-лог входящего запроса)
  → apps/api/src/routes/blogs.routes.ts:16       (router.post("/", createBlog))
  → apps/api/src/controllers/blogs.controller.ts:15  (BlogInputSchema.safeParse)
      ↳ 400 + ApiErrorResult при провале валидации
  → apps/api/src/services/blogs.service.ts:10    (createBlog)
  → apps/api/src/db/repositories/blogs.repository.ts:9  (BlogModel.create)
  → MongoDB: коллекция "blogs"
  → blogs.repository.ts:41 toViewModel()         (Date → ISO string, _id → hex string)
  ← 201 + BlogViewModel
  → apps/api/src/middleware/errorHandler.ts      (только при выброшенном HttpError)
```

Для постов поток идентичен, но между сервисом и репозиторием добавляется шаг:

```
posts.service.ts:14  blogsRepository.findById(input.blogId)
  ↳ { blogIdNotFound: true }  →  posts.controller.ts:23  →  400
```

Для видео контроллер принудительно приводит `req.params.id` к `Number` перед передачей в сервис (`apps/api/src/controllers/videos.controller.ts:27`).

## Shared-контракты (`@app/shared`)

Источник: `packages/shared/src/index.ts`

### Входные схемы (Zod)

```typescript
BlogInputSchema = z.object({
  description: z.string().trim().min(1).max(500),
  name: z.string().trim().min(1).max(15),
  websiteUrl: z
    .string()
    .max(100)
    .regex(/^https:\/\/([a-zA-Z0-9_-]+\.)+[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*\/?$/),
});

PostInputSchema = z.object({
  blogId: z.string().trim().min(1),
  content: z.string().trim().min(1).max(1000),
  shortDescription: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(30),
});

CreateVideoInputSchema = z.object({
  author: z.string().min(1).max(20).trim(),
  availableResolutions: z.array(videoResolutionSchema).min(1),
  title: z.string().min(1).max(40).trim(),
});

UpdateVideoInputSchema = z.object({
  author: z.string().min(1).max(20).trim(),
  availableResolutions: z.array(videoResolutionSchema).min(1),
  canBeDownloaded: z.boolean(),
  minAgeRestriction: z.number().int().min(1).max(18).nullable(),
  publicationDate: z.iso.datetime(),
  title: z.string().min(1).max(40).trim(),
});
```

### ViewModel-типы (TypeScript)

```typescript
type BlogViewModel = {
  createdAt: string;
  description: string;
  id: string;
  isMembership: boolean;
  name: string;
  websiteUrl: string;
};

type PostViewModel = {
  blogId: string;
  blogName: string;
  content: string;
  createdAt: string;
  id: string;
  shortDescription: string;
  title: string;
};

type VideoViewModel = {
  author: string;
  availableResolutions: VideoResolution[];
  canBeDownloaded: boolean;
  createdAt: string;
  id: number;
  minAgeRestriction: null | number;
  publicationDate: string;
  title: string;
};

type VideoResolution = "P144" | "P240" | "P360" | "P480" | "P720" | "P1080" | "P1440" | "P2160";
```

Эти типы импортируют и BE (контроллеры, сервисы, репозитории) и FE (когда появится). Любое изменение здесь — breaking change для обеих сторон.

## Mongoose-модели

### Blog — `apps/api/src/db/models/blog.model.ts`

Коллекция: `blogs`

| Поле           | Тип      | Default    | Обязательное |
| -------------- | -------- | ---------- | ------------ |
| `_id`          | ObjectId | —          | авто         |
| `name`         | String   | —          | да           |
| `description`  | String   | —          | да           |
| `websiteUrl`   | String   | —          | да           |
| `isMembership` | Boolean  | `false`    | да           |
| `createdAt`    | Date     | `Date.now` | да           |

`timestamps: false`, `versionKey: false`. `isMembership` всегда записывается как `false` — реальная логика подписки не реализована.

### Post — `apps/api/src/db/models/post.model.ts`

Коллекция: `posts`

| Поле               | Тип      | Default    | Обязательное |
| ------------------ | -------- | ---------- | ------------ |
| `_id`              | ObjectId | —          | авто         |
| `title`            | String   | —          | да           |
| `shortDescription` | String   | —          | да           |
| `content`          | String   | —          | да           |
| `blogId`           | String   | —          | да           |
| `blogName`         | String   | —          | да           |
| `createdAt`        | Date     | `Date.now` | да           |

`blogId` хранится как строка (hex ObjectId блога). `blogName` денормализован — копируется в момент создания/обновления поста.

### Video — `apps/api/src/db/models/video.model.ts`

Коллекция: `videos`

| Поле                   | Тип      | Default    | Обязательное |
| ---------------------- | -------- | ---------- | ------------ |
| `_id`                  | Number   | —          | да (явно)    |
| `title`                | String   | —          | да           |
| `author`               | String   | —          | да           |
| `availableResolutions` | [String] | —          | да           |
| `canBeDownloaded`      | Boolean  | `false`    | да           |
| `minAgeRestriction`    | Number   | `null`     | нет          |
| `createdAt`            | Date     | `Date.now` | да           |
| `publicationDate`      | Date     | —          | да           |

`_id: Number` — намеренное отклонение от ObjectId. Значение `id` в VideoViewModel равно `Date.now()` на момент вызова `createVideo`. Это не UUID и не sequence — коллизии теоретически возможны при конкурентных запросах в одну миллисекунду.

## Ключевые ссылки file:line

### Роуты (`apps/api/src/routes/`)

- `blogs.routes.ts:16–20` — маппинг пяти методов на контроллер; `registerPaths` с OpenAPI-spec на строках 47–123
- `posts.routes.ts:16–20` — аналогично; OpenAPI на строках 48–124
- `videos.routes.ts:16–20` — аналогично; OpenAPI на строках 51–131
- `testing.routes.ts:8` — `router.delete("/all-data", clearAllData)`
- `app.ts:31–34` — wiring всех роутеров в Express

### Контроллеры (`apps/api/src/controllers/`)

- `blogs.controller.ts:15` — `createBlog`: `BlogInputSchema.safeParse` → `blogsService.createBlog` → 201
- `blogs.controller.ts:25` — `deleteBlog`: `NotFoundError` пробрасывается через Express, перехватывается `errorHandler`
- `blogs.controller.ts:38` — `listBlogs`
- `blogs.controller.ts:42` — `updateBlog`: 204 без тела при успехе
- `blogs.controller.ts:55` — `mapZodError`: конвертирует `ZodError` в `ApiErrorResult`
- `posts.controller.ts:15` — `createPost`: проверяет `{ blogIdNotFound: true }` из сервиса → 400
- `posts.controller.ts:50` — `updatePost`: аналогичная проверка `blogIdNotFound`
- `videos.controller.ts:27` — `deleteVideo`: `Number(req.params.id)` — явное приведение строки к числу
- `videos.controller.ts:36` — `getVideo`: то же приведение
- `videos.controller.ts:49` — `updateVideo`: то же приведение
- `testing.controller.ts:7` — `clearAllData`: `Promise.all([clearAllBlogs(), clearAllPosts(), clearAllVideos()])`

### Сервисы (`apps/api/src/services/`)

- `blogs.service.ts:10` — `createBlog`
- `blogs.service.ts:18` — `deleteBlog`: `NotFoundError` если `remove` вернул `false`
- `blogs.service.ts:27` — `getBlogById`: `NotFoundError` если не найден
- `blogs.service.ts:33` — `updateBlog`: сначала `findById` для 404, затем `update`
- `posts.service.ts:11` — `createPost`: возвращает `PostViewModel | { blogIdNotFound: true }`
- `posts.service.ts:41` — `updatePost`: сначала `findById` поста (404), затем `findById` блога (blogIdNotFound)
- `videos.service.ts:10` — `createVideo`: `id = Date.now()`, `publicationDate = now + 24h`
- `videos.service.ts:44` — `updateVideo`: сначала `findById` для 404, затем `update`

### Репозитории (`apps/api/src/db/repositories/`)

- `blogs.repository.ts:9` — `create`: `BlogModel.create(input)` → `toViewModel`
- `blogs.repository.ts:36` — `update`: `findByIdAndUpdate(id, patch, { new: true })` — возвращает обновлённый документ
- `blogs.repository.ts:41` — `toViewModel`: `doc._id.toHexString()` → `id: string`, `doc.createdAt.toISOString()` → `createdAt: string`
- `posts.repository.ts:36` — `update`: аналогично, `{ new: true }`
- `posts.repository.ts:41` — `toViewModel`
- `videos.repository.ts:9` — `create`: маппинг `video.id → _id`, `new Date(video.publicationDate)`
- `videos.repository.ts:43` — `update`: `findByIdAndUpdate(..., { new: true })`
- `videos.repository.ts:59` — `toViewModel`: `doc._id` напрямую в `id: number`

### Модели (`apps/api/src/db/models/`)

- `blog.model.ts:11–22` — `blogSchema` с полями и дефолтами
- `post.model.ts:11–22` — `postSchema`
- `video.model.ts:16–28` — `videoSchema` с `_id: Number`

## Тестирование

### Конфигурация

- `apps/api/vitest.config.ts` — `maxWorkers: 1`, `pool: "forks"`, `setupFiles: ["./src/test/setup.ts"]`
- `apps/api/src/test/setup.ts` — `MongoMemoryServer` поднимается в `beforeAll`, `mongoose.disconnect` + `mongoServer.stop` в `afterAll`, все коллекции очищаются в `afterEach` через `deleteMany({})`

Изоляция на уровне `afterEach` гарантирует что тесты не зависят от порядка запуска. `maxWorkers: 1` нужен потому что все процессы разделяют одну in-memory MongoDB через `mongoose.connect` в `setup.ts` — параллельные воркеры читали бы чужие данные.

### Тест-файлы и количество кейсов

| Файл                                         | Тестов |
| -------------------------------------------- | ------ |
| `apps/api/src/routes/blogs.routes.test.ts`   | 16     |
| `apps/api/src/routes/posts.routes.test.ts`   | 17     |
| `apps/api/src/routes/videos.routes.test.ts`  | 17     |
| `apps/api/src/routes/testing.routes.test.ts` | 2      |
| `apps/api/src/routes/health.routes.test.ts`  | 3      |
| **Итого**                                    | **55** |

Тесты написаны как интеграционные: `supertest` поднимает `createApp()` (без реального порта), работает с реальной Mongoose-моделью против MongoMemoryServer. Моков нет.

### Запуск

```bash
pnpm test                          # все пакеты
pnpm -F @app/api test              # только API
pnpm -F @app/api test --reporter=verbose   # с детализацией по кейсам
```

## Известные gaps и намеренные решения

- **Авторизация отсутствует.** Все эндпоинты публичны. Реализация auth в scope не входит на данном этапе.
- **`isMembership` захардкожен как `false`** (`blog.model.ts:15`). Реальная проверка подписки — отдельная задача.
- **`id` видео = `Date.now()`** (`videos.service.ts:11`). При двух одновременных запросах в одну миллисекунду возникнет конфликт `_id`. Допустимо пока нагрузки нет, но не годится для production.
- **`findByIdAndUpdate(..., { new: true })`** в репозиториях blogs и posts (`blogs.repository.ts:36`, `posts.repository.ts:36`, `videos.repository.ts:43`) использует устаревший в Mongoose 8 синтаксис. Правильный вариант — `{ returnDocument: 'after' }`. Работает, но генерирует deprecation warning.
- **Пагинация не реализована.** `GET /api/blogs`, `/api/posts`, `/api/videos` возвращают все документы коллекции без limit/offset/cursor.
- **`blogName` денормализован в Post.** При переименовании блога существующие посты сохраняют старое имя — нет механизма синхронизации.
- **FE-слой отсутствует.** `apps/web/src/features/blogs/` и `apps/web/src/features/posts/` — пустые директории согласно git status. Фичи реализованы только на BE.

## Слои и переход на фазу 2 (NestJS)

Текущее разбиение по слоям спроектировано так, что миграция на NestJS будет механической:

- **Сервисы** (`services/*.service.ts`) не знают об Express — они станут `@Injectable()` классами без изменения сигнатур.
- **Репозитории** (`db/repositories/*.repository.ts`) обернут TypeORM/Prisma репозиторий вместо Mongoose — публичные функции (`create`, `findById`, `findAll`, `update`, `remove`) останутся теми же.
- **DTO** (`packages/shared/src/index.ts`) не тронутся — они уже независимы от транспорта и ORM.
- **Контроллеры** переедут на NestJS-декораторы (`@Controller`, `@Get`, `@Body` и т.д.) — логика внутри (парсинг → вызов сервиса → ответ) идентична.

Швы уже существуют. Смешивать слои сейчас — значит усложнить миграцию.
