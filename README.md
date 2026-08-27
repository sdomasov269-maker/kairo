# Kairo

Kairo — прототип современной платформы для просмотра, открытия и коллекционирования аниме. Интерфейс использует собственную графитовую дизайн-систему, CSS-generated иллюстрации и необязательную WebGL-композицию.

## Стек

- Next.js 16, App Router и React 19
- TypeScript в строгом режиме
- Tailwind CSS 4 и дизайн-токены на CSS variables
- Motion for React
- Three.js, React Three Fiber и Drei
- AniList GraphQL API через собственный серверный `fetch`-клиент
- Lucide React, ESLint и Prettier

## Запуск

Требуются Node.js 20.9 или новее и npm.

```powershell
npm.cmd install
npm.cmd run dev
```

Откройте `http://localhost:3000`. Проверки качества:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run format:check
npm.cmd run build
```

## Архитектура

- `src/app` — App Router, главная и динамический маршрут `/anime/[slug]`
- `src/components/anime` — карточки, постеры и экран отдельного аниме
- `src/components/home` — hero, неизменённая 3D-сцена и секции главной
- `src/i18n` — типизированные словари RU/UK/EN и клиентский переключатель
- `src/lib/anilist` — GraphQL-запросы, типы, timeout, мапперы и очистка HTML
- `src/data/catalog.ts` — локальная конфигурация slug, оригиналы Kairo и fallback-данные
- `src/types/media.ts` — внутренние доменные модели

Страницы каталога читают метаданные из локальной PostgreSQL через серверный репозиторий. AniList и Shikimori вызываются только защищённым импортом и не попадают в клиентский код.

Русский язык рендерится по умолчанию. Выбор RU/UK/EN читается из `localStorage` только после монтирования, поэтому первоначальная гидратация остаётся стабильной.

## Изображения и 3D

Постеры AniList проходят через `next/image`; разрешены только точные пути CDN `s4.anilist.co`. При ошибке изображения единый компонент `AnimePoster` переключается на CSS-композицию. Вымышленные оригиналы сразу используют CSS fallback.

Установите `NEXT_PUBLIC_ENABLE_3D=false` в `.env.local`, чтобы отключить WebGL. Сцена также не запускается при `prefers-reduced-motion`.

## Следующие этапы

1. Полная страница каталога и фильтры
2. Поиск
3. Собственный видеоплеер
4. Профиль и история просмотра
5. Backend и синхронизация
6. Лицензированные источники контента

# Backend preparation

Kairo currently remains fully usable in guest mode. Guest progress and
preferences stay in the documented `kairo:*` localStorage stores.

The repository contains a PostgreSQL/Prisma schema for the upcoming account
backend. Install the backend dependencies before enabling it:

```powershell
npm.cmd install next-auth@4.24.15 @auth/prisma-adapter @prisma/client@6.19.2 bcryptjs zod
npm.cmd install --save-dev prisma@6.19.2 tsx
```

Copy `.env.example` to `.env.local`, replace the development database password,
and generate `AUTH_SECRET` with the command documented in `.env.example`.
Never commit `.env.local`.

PostgreSQL can be supplied independently or started with Docker:

```powershell
$env:POSTGRES_PASSWORD = "use-a-local-development-password"
docker compose up -d postgres
npm.cmd exec prisma generate
npm.cmd exec prisma migrate dev --name init
```

Google OAuth is optional. Email delivery, mandatory email verification and
password reset are deliberately not enabled until a mail provider is
configured. No reset or verification tokens should be printed in production.

The database schema includes Auth.js adapter tables, user roles, watch
progress, anime-list entries, preferences, verification records and hashed
password-reset records. Account-bound synchronization must merge data in a
transaction; it must never erase guest data before the server confirms the
write. A CSP is intentionally deferred until nonce-aware Next.js handling is
designed for the application as a whole.

## Guest and account data

NextAuth is the only source of authentication state. `DataMode` selects one of
two data sources:

- guest mode uses the browser stores `kairo:watch-progress:v2`,
  `kairo:anime-list:v1` and `kairo:player-preferences:v1`;
- account mode uses PostgreSQL as the source of truth and keeps an offline
  cache under `kairo:account-cache:v1:<userId>`.

Account caches are validated and namespaced by user ID. A cache never
establishes authentication and data from one account is not rendered while a
different account is loading.

After sign-in, local history, list entries and player preferences can be merged
through `/api/me/merge-local-data`. The server takes ownership only from the
session, validates and limits the payload, and performs the merge in a
serializable Prisma transaction. Guest data is retained until the server
confirms the merge and the user approves local cleanup.

## Offline synchronization

Account mutations are applied optimistically and stored in
`kairo:pending-sync:v1`. Operations are tied to a user ID, capped at 300,
validated on read, deduplicated by entity and processed sequentially. Network
errors, HTTP 408, 429 and 5xx responses use a jittered backoff of approximately
5 seconds, 15 seconds, 45 seconds, 2 minutes, 5 minutes and at most 15 minutes.
Validation and forbidden responses are rejected permanently. A 401 pauses
synchronization, preserves the queue and exposes a sign-in action.

The development rate limiter for local-data merge is process-local. A
multi-instance production deployment must replace it with Redis or another
shared limiter.

## Development and manual QA

Development intentionally uses webpack:

```powershell
cd D:\ANIME
npm run dev:all
```

This recommended command starts both services in one PowerShell window, with
`[WEB]` and `[PROVIDER]` log prefixes:

- Kairo: `http://localhost:3000`
- anime-provider: `http://127.0.0.1:8787`

The provider automatically reads `.env.local` and then `.env`; existing
process/OS environment values retain priority. Check a running provider with
`npm run provider:health`.

The older two-terminal workflow remains available when separate logs are
useful:

```text
Terminal 1:
npm run provider:dev

Terminal 2:
npm run dev
```

Press `Ctrl+C` in the combined terminal to stop both services.

Before a release, test guest mode, two separate accounts, local-data merge,
offline mutations followed by reconnect, session expiry, keyboard navigation,
and 320 px layouts. Confirm that each account sees only its own progress, list,
preferences, cache and queued operations.

In some restricted automation environments Next.js completes production
compilation and then fails to start a child process with `spawn EPERM`. This is
an environment restriction and must not be reported as a successful full
build. Re-run the complete build in a normal Windows terminal.

The next planned backend feature is an admin panel. It must reuse the existing
session roles and data services rather than weakening ownership checks in the
private `/api/me/*` routes.

# Anime metadata import

The application reads anime metadata exclusively from PostgreSQL. The protected
server importer uses AniList, connects Shikimori by AniList `idMal`, and applies
reviewed Ukrainian overrides from
`src/data/localizations/anime-overrides.uk.ts`. Ukrainian titles are never
machine-guessed.

After applying migrations and generating Prisma Client, import one page (up to
50 titles) from a trusted server or CI job:

```bash
curl -X POST http://localhost:3000/api/admin/anime-import \
  -H "Authorization: Bearer $ANIME_IMPORT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"page":1,"perPage":50}'
```

Repeat with subsequent page numbers to fill a larger local catalogue. Browser
code never calls AniList or Shikimori.
