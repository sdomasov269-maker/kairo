# Локализация названий аниме

## Архитектура

Публичные страницы продолжают получать метаданные через существующий контур AniList → snapshot → Jikan. Локализованные названия импортируются отдельно серверной CLI-командой и сохраняются в PostgreSQL. При рендеринге списки обогащаются одним пакетным запросом; браузер никогда не обращается к Shikimori или Wikidata.

`AnimeLocalizedTitle` хранит основное RU/UK-название и признаки `verified`/`locked`. `AnimeTitleAlias` хранит варианты для поиска. `AnimeTitleLookupCache` различает найденный, ненайденный, неоднозначный и временно ошибочный ответ. Отрицательный cache имеет ограниченный TTL.

## Источники и fallback

Приоритет записи: `MANUAL → IMPORTED → SHIKIMORI → WIKIDATA → WIKIPEDIA → AI`; `locked` всегда выше источника. Shikimori используется первым для русского названия и связывается через MAL ID. Wikidata возвращает украинские/русские labels, aliases и Wikipedia sitelinks; русский вариант используется только если Shikimori не дал надёжный результат. AI оставлен как будущий источник и сейчас не вызывается.

Отображение:

- RU: локализованное → English → Romaji → Native → «Название неизвестно»;
- UK: локализованное → English → Romaji → Native → «Назва невідома»;
- EN: English → Romaji → Native → `Unknown title`.

Русский вариант намеренно не является fallback для украинского.

## Сопоставление

Score учитывает максимум внутри групп названий: native +45, romaji/English +35, synonym +25, год +15, формат +10, эпизоды +10. Противоречия дают −30/−20/−15. Score ограничен 0–100; автоматически принимается результат от 80. Разница между двумя лидерами менее 8 считается неоднозначностью.

## Настройки

```env
ANIME_TITLES_SHIKIMORI_ENABLED=true
ANIME_TITLES_WIKIDATA_ENABLED=true
SHIKIMORI_API_BASE_URL=https://shikimori.one/api
WIKIDATA_API_BASE_URL=https://www.wikidata.org/w/api.php
ANIME_TITLES_CONCURRENCY=2
ANIME_TITLES_REQUEST_DELAY_MS=500
ANIME_TITLES_MAX_RETRIES=2
ANIME_TITLES_REQUEST_TIMEOUT_MS=10000
```

Провайдеры используют User-Agent, AbortController, ограниченный retry для 429/5xx/сетевых сбоев и последовательный rate limiter. 400/404 не повторяются.

## Миграция и запуск

Перед локализацией таблица `Anime` заполняется отдельной командой, подробно описанной в `docs/anime-index-sync.md`:

```powershell
npm run anime:index:sync -- --limit=100 --dry-run
npm run anime:index:sync -- --limit=100 --only-missing
```

```powershell
npm run db:migrate
npm run db:generate
npm run titles:sync -- --locale=ru --limit=100 --dry-run
npm run titles:sync -- --locale=ru --limit=100
npm run titles:sync -- --locale=uk --only-missing
npm run titles:sync -- --anilist-id=16498 --dry-run
npm run titles:sync -- --locale=uk --limit=100 --only-missing --resume
npm run titles:sync -- --locale=ru --skip-wikidata --only-missing
```

Поддерживаются `--locale=ru|uk|all`, `--limit`, `--offset`, `--after-anilist-id`, `--anilist-id`, `--provider=shikimori|wikidata`, `--skip-wikidata`, `--skip-shikimori`, `--resume`, `--checkpoint`, `--dry-run`, `--force`, `--only-missing`, `--min-confidence`. `--force` не обходит `locked` и `MANUAL`. Checkpoint записывается после каждого Anime в `.data/anime-title-checkpoints/`. Повторный запуск безопасен: основные записи и aliases имеют уникальные ключи, а менее уверенный результат не заменяет лучший.

RU и UK разрешаются независимо. Точный Shikimori MAL match завершает RU resolution и не конкурирует с Wikidata; Wikidata при этом может отдельно разрешать UK. Статистика разделяет Anime с названием, созданные строки, пропущенные строки, candidates, aliases, ambiguous/not-found по каждой локали и API errors. Счётчики одной локали никогда не превышают `processedAnime`.

Wikidata хранит in-process search/entity cache, включая отрицательные ответы, и выводит `searchRequests`, `entityRequests`, cache hits/misses и среднюю длительность запроса. Database lookup cache сохраняется между запусками.

CLI запускается через Node TypeScript stripping. Чтобы не менять модульный режим всего Next.js-проекта, только CLI-команды подавляют конкретное диагностическое предупреждение `MODULE_TYPELESS_PACKAGE_JSON`; `"type": "module"` в корень не добавляется.

## Runtime Prisma

Runtime использует singleton из `src/lib/db/prisma.ts`; отдельные PrismaClient существуют только в изолированных CLI-процессах. Если generated client устарел и не содержит `animeLocalizedTitle`, enrichment возвращает публичные данные без локализации и один раз пишет `PRISMA_MODEL_UNAVAILABLE` с инструкцией выполнить `prisma generate` и перезапустить Next.js. Отдельно классифицируются отсутствующая таблица, недоступная БД и прочая ошибка запроса.

## Hydration и LCP

Hero-постер единственный получает высокий fetch priority; карточки каталога остаются lazy/default. Атрибуты `ipa-annotator-disabled` на `body` и inline `transition-property`/`margin-right` на `html` не создаются Kairo и характерны для браузерных расширений. Глобальный `suppressHydrationWarning` не добавлялся; проверяйте mismatch в чистом профиле.

Импорт берёт пакет из существующей таблицы `Anime`; он не выполняет 5000 параллельных AniList-запросов. Для продолжения после остановки используйте `--offset` или повторный запуск с `--only-missing`. Отчёты сохраняются в `reports/anime-title-sync/` и исключены из Git.

## Ошибки и расширение

Ошибка одного тайтла фиксируется в отчёте и не останавливает пакет. Временная ошибка кэшируется кратко, а отсутствие результата — на семь дней. Новый провайдер реализует `AnimeTitleProvider` и добавляется в список CLI. Будущий AI-провайдер должен возвращать тот же тип результата и иметь самый низкий приоритет; автоматическое буквальное преобразование известных названий запрещено.
