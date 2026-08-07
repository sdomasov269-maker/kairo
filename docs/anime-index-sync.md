# Синхронизация локального Anime index

## Назначение

Таблица `Anime` — локальный индекс метаданных для локализованных названий, aliases, поиска и будущей административной панели. Она не заменяет публичный pipeline: страницы продолжают работать через `AniList → snapshot → Jikan`, даже если индекс пуст или PostgreSQL временно недоступен.

Потоки данных разделены:

```text
публичный каталог: AniList → snapshot → Jikan
локальный индекс: snapshot/catalog → PostgreSQL Anime
локализация: PostgreSQL Anime → Shikimori/Wikidata → localized titles
```

## Источники

Без `--source` CLI сначала ищет `.data/anime-snapshots` (или `KAIRO_ANIME_SNAPSHOT_DIR`). Все snapshot-файлы читаются последовательно и дедуплицируются по AniList ID. `--source=catalog` и `--source=anilist` используют существующий AniList client с его timeout, retry и обработкой HTTP 403; они нужны только когда локальных данных недостаточно. Отдельные запросы ради MAL ID не выполняются.

В текущем workspace snapshot содержит 119 вхождений и 50 валидных уникальных AniList ID. Это не полный каталог из 5000 записей. Полное заполнение потребует явной пагинации `--source=anilist` либо предварительно сформированного полного snapshot.

## Команды

```powershell
npm run anime:index:sync -- --limit=10 --dry-run
npm run anime:index:sync -- --limit=100 --dry-run
npm run anime:index:sync -- --limit=100 --only-missing
npm run anime:index:sync -- --limit=100 --update-existing
npm run anime:index:sync -- --source=snapshot --only-missing
npm run anime:index:sync -- --source=anilist --page=1 --pages=2 --limit=100 --dry-run
npm run anime:index:sync -- --source=anilist --resume --only-missing
```

Для AniList index страницы выполняются последовательно. HTTP 429 учитывает `Retry-After`, иначе используется exponential backoff с jitter. Настройки: `ANILIST_INDEX_REQUEST_DELAY_MS`, `ANILIST_INDEX_MAX_RETRIES`, `ANILIST_INDEX_BACKOFF_BASE_MS`, `ANILIST_INDEX_BACKOFF_MAX_MS`; concurrency намеренно равна 1. Checkpoint хранится в `.data/anime-index-checkpoints/anilist.json`; альтернативный путь задаётся `--checkpoint=...`. `--resume` начинает с `nextPage`, а не с первой страницы.

`--only-missing` создаёт только отсутствующие AniList ID. `--update-existing` обновляет непустые индексные метаданные, но не меняет localized titles, aliases и relations. Входящий `null` не стирает существующее значение. Существующий slug сохраняется; новый формируется общим `anilistSlug`.

Для продолжения после сбоя используйте `--offset` и тот же `--batch-size` либо безопасно повторите `--only-missing`. Пакеты ограничены 200 строками и фиксируются отдельными транзакциями. Никакие записи автоматически не удаляются.

## Отчёты

Каждый запуск создаёт каталог в `reports/anime-index-sync/` с `summary.json`, invalid records, duplicate AniList IDs/slugs, missing MAL IDs и sync errors. Исходные ответы внешних API в отчёт не записываются.

## Полный запуск

Локальный полный snapshot:

```powershell
npm run anime:index:sync -- --source=snapshot --only-missing
```

Явная AniList-пагинация, если полного snapshot нет:

```powershell
npm run anime:index:sync -- --source=anilist --page=1 --pages=100 --limit=5000 --only-missing
```

Полный импорт нельзя запускать из пользовательского request path. После индексации локализация запускается отдельно:

```powershell
npm run titles:sync -- --locale=all --limit=5000 --only-missing
```

## Windows и Prisma

Перед генерацией клиента и миграцией остановите `npm run dev` через `Ctrl+C`:

```powershell
npm run db:generate
npm run db:migrate
```

Если возникает `EPERM`, определите процесс, удерживающий `query_engine-windows.dll.node` или блокирующий запуск `schema-engine-windows.exe`, и остановите именно его. Не удаляйте DLL вручную. `generate --no-engine` допустим только как временная статическая проверка и не является production-решением. Если migration завершилась ошибкой, нельзя считать её применённой.
