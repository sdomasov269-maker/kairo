# Kairo

## Диагностика интеграции Kodik

Дата: 5 августа 2026 года  
Версия проекта: 0.1.0 (Git metadata недоступны)  
Среда: Windows 11, AMD64, Node.js 24.15.0  
Next.js: 16.2.12  
Prisma Client: 6.19.2

## 1. Краткое резюме

Интеграция Kodik работает частично и сейчас заблокирована внешней сетевой причиной и конфигурацией playback. Серверный токен присутствует в `.env.local`, trim-ится и не попадает в клиентский код или диагностические результаты. Проверить права токена невозможно: `kodikapi.com` не разрешается через DNS (`ENOTFOUND`), поэтому HTTP-запрос и TLS-соединение не начинаются. Домен iframe `kodik.info` в той же среде также возвращает `ENOTFOUND`.

До исправления сервис подменял DNS, HTTP 401/403/5xx и пустой `results` локальным мок-релизом со статусом `OK`. Watch-resolver дополнительно мог показывать один публичный embed как видео любого тайтла. Эти подмены делали точный диагноз невозможным и создавали ложную доступность видео. Подмены удалены.

- Токен настроен: да, длина 49, маска `===Q*****************************************hZTN`.
- API доступен с текущей машины: нет, DNS `ENOTFOUND`.
- Токен проверен upstream-сервером: нет, запрос не достиг API.
- Реальные релизы найдены: проверить невозможно.
- Проблем найдено: 10.
- Исправлено: 6.
- Осталось/требует внешнего или ручного действия: 4.
- Итог: интеграция работает частично; реальный playback не готов.

## 2. Исходная архитектура

```text
Anime page
  -> resolveAnimeBySlug / PostgreSQL
  -> Anime.malId
  -> KodikService.search(shikimori_id = malId)
  -> https://kodikapi.com/search?token=SECRET
  -> Zod parse
  -> ошибка, HTTP error или [] превращались в универсальный mock OK
  -> список episode keys / translation / embed URL
  -> episode.service
  -> watch resolver мог добавить общий публичный embed
  -> KodikEmbedPlayer
```

Токен формировался только на сервере, однако ошибочные mock-переходы стирали различие между `NOT_FOUND`, auth, сетью и успешным результатом.

## 3. Архитектура после изменений

```text
Anime page / Watch page (Server Components)
  -> PostgreSQL Anime (internal id, AniList id, MAL id, titles)
  -> KodikService (server directory)
  -> confirmed strategy: shikimori_id = Anime.malId
  -> configurable https://kodikapi.com/search
  -> AbortController timeout + bounded retry for timeout/network/429/5xx
  -> content-type + byte limit + JSON + tolerant Zod validation
  -> explicit status: OK / NOT_FOUND / AUTH / FORBIDDEN / RATE_LIMITED /
     NETWORK / TIMEOUT / INVALID_JSON / SCHEMA_MISMATCH / ...
  -> HTTPS and explicit embed-host allowlist
  -> exact requested season/episode
  -> KodikEmbedPlayer only for a real accepted embed URL
  -> otherwise existing local PlayerLoader/unavailable state
```

Не добавлялись клиентские API-вызовы, новые таблицы или запись данных Kodik в БД. AniList и локализация не менялись.

## 4. Конфигурация и безопасность

| Проверка                         | Результат                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| `KODIK_API_TOKEN` в `.env.local` | Присутствует, непустой, 49 символов                                                 |
| Кавычки/внешние пробелы          | Не обнаружены                                                                       |
| System process env               | Токен отсутствует; ожидаемо загружается из env-файла Next.js                        |
| `NEXT_PUBLIC_KODIK_API_TOKEN`    | Использование в коде не найдено                                                     |
| `KODIK_PROVIDER_ENABLED`         | `true`                                                                              |
| `KODIK_PLAYBACK_ENABLED`         | `false`                                                                             |
| `KODIK_ALLOWED_EMBED_HOSTS`      | Не настроен                                                                         |
| Рабочий `configured`             | `false`                                                                             |
| Токен в логах/CLI                | Не выводится; URL очищается до origin + pathname                                    |
| Запросы из client bundle         | Не обнаружены; сервис расположен в `src/server` и импортируется server page/service |

Отдельный пакет `server-only` в зависимостях отсутствует, поэтому прямой `import "server-only"` не добавлялся: это сломало бы Node unit tests. Эквивалентная граница обеспечивается размещением и цепочкой импортов, но рекомендуется позже добавить автоматическую lint/bundle-проверку.

## 5. Матрица тестовых тайтлов

Все восемь строк проверены на наличие локальных идентификаторов. Один безопасный CLI-запрос выполнен для Attack on Titan; остальные upstream-поиски сознательно не повторялись, потому что глобальный DNS-блокер возникает до обработки параметров и повторные запросы не дали бы новых доказательств.

| Тайтл                                      | Internal ID                 | AniList | MAL/Shikimori | Тип/год          | Стратегия    | Результаты | Релиз/перевод/эпизоды | Статус                  |
| ------------------------------------------ | --------------------------- | ------: | ------------: | ---------------- | ------------ | ---------: | --------------------- | ----------------------- |
| Attack on Titan / Атака титанов            | `cmsd598qz000li6n4u5toqtac` |   16498 |         16498 | TV, 2013         | shikimori_id |          0 | не получены           | NETWORK_ERROR ENOTFOUND |
| Demon Slayer / Клинок, рассекающий демонов | `cmsd598va002ei6n4561a5ob3` |  101922 |         38000 | TV, 2019         | shikimori_id |        n/a | заблокировано DNS     | BLOCKED_NETWORK         |
| Death Note / Тетрадь смерти                | `cmsd598sz001ei6n4gthxrdiy` |    1535 |          1535 | TV, 2006         | shikimori_id |        n/a | заблокировано DNS     | BLOCKED_NETWORK         |
| A Silent Voice / Форма голоса              | `cmsd5bk940014i6u8cncelw6i` |   20954 |         28851 | Movie, 2016      | shikimori_id |        n/a | заблокировано DNS     | BLOCKED_NETWORK         |
| Attack on Titan Season 2                   | `cmsd5bkd0002ci6u8sqvmhf5b` |   20958 |         25777 | TV, 2017         | shikimori_id |        n/a | заблокировано DNS     | BLOCKED_NETWORK         |
| One Piece / Ван-Пис                        | `cmsd4hxly0001i6twagcloiad` |      21 |            21 | TV, 1999, airing | shikimori_id |        n/a | заблокировано DNS     | BLOCKED_NETWORK         |
| Solo Leveling Season 2                     | `cmsd5bk9t001ci6u8bv9x43at` |  176496 |         58567 | TV, 2025         | shikimori_id |        n/a | заблокировано DNS     | BLOCKED_NETWORK         |
| Jujutsu Kaisen Season 3                    | `cmsd598um0024i6n4vgf0i2k6` |  172463 |         57658 | TV, 2026         | shikimori_id |        n/a | заблокировано DNS     | BLOCKED_NETWORK         |

Локальная БД содержит 4207 аниме, из них 3821 имеют `malId`. Отдельного поля Shikimori ID в Prisma нет; текущий подтверждённый код использует MAL ID как значение параметра `shikimori_id`. Параметры `anilist_id`, `myanimelist_id` и прямой upstream title search не добавлялись без подтверждённого контракта API.

## 6. Выявленные проблемы и журнал

| ID        | Severity      | Категория | Симптом и причина                                                   | Проверка/доказательство                                                    | Исправление                                            | Статус              |
| --------- | ------------- | --------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------- |
| KODIK-001 | Critical      | API       | HTTP, DNS и пустые results превращались в mock `OK`                 | Unit tests старой логики ожидали mock для 401/network/[]                   | Удалён mock; добавлена классификация                   | FIXED               |
| KODIK-002 | Critical      | UI        | Один публичный embed выдавался как видео любого тайтла              | `resolveKodikEmbedUrl` не требовал реальный release                        | Удалена дефолтная ссылка; iframe только с реальным URL | FIXED               |
| KODIK-003 | High          | NETWORK   | API и iframe не разрешаются по DNS                                  | `dns.lookup`, TLS и fetch: `ENOTFOUND`                                     | Обход не внедрялся; требуется сеть/DNS                 | NEEDS_MANUAL_ACTION |
| KODIK-004 | High          | CONFIG    | Playback выключен и allowlist пуст                                  | `.env.local`: playback false, hosts absent                                 | Безопасно оставлено выключенным                        | NEEDS_MANUAL_ACTION |
| KODIK-005 | High          | API       | 401/403/429/5xx/timeout не различались                              | Анализ `requestSearch`                                                     | Добавлены отдельные статусы и bounded retry            | FIXED               |
| KODIK-006 | High          | SCHEMA    | Invalid JSON и schema mismatch сливались                            | Анализ catch вокруг parse                                                  | Разделены content-type, JSON, schema и size            | FIXED               |
| KODIK-007 | Medium        | CONFIG    | Endpoint был жёстко задан                                           | URL создавался из literal                                                  | Используется `KODIK_API_BASE_URL` с безопасным default | FIXED               |
| KODIK-008 | Medium        | TEST      | Не было полноценного read-only CLI и exit codes                     | Существующий `test-kodik.ts` поддерживал только 3 селектора и общий exit 1 | Добавлен `providers:kodik:diagnose`                    | FIXED               |
| KODIK-009 | High          | SECURITY  | Письменное разрешение/официальный контракт playback не подтверждены | Существующие policy/docs имеют `PARTNER_ACCESS_REQUIRED`                   | Код не обходит policy; требуется владелец проекта      | NEEDS_MANUAL_ACTION |
| KODIK-010 | Informational | TEST      | Управляемый браузер недоступен                                      | Browser runtime вернул пустой список                                       | Серверные HTTP checks выполнены; browser check отложен | BLOCKED             |

За время проверки база данных не изменялась. Массовые импорты и destructive Prisma-команды не выполнялись.

## 7. Отклонённые гипотезы

1. **HYPOTHESIS_REJECTED: токен отсутствует.** Он присутствует и загружается из `.env.local`; upstream не смог его проверить из-за DNS.
2. **HYPOTHESIS_REJECTED: проблема вызвана пустым results.** Фактический запрос не достиг HTTP-уровня.
3. **HYPOTHESIS_REJECTED: CSP Kairo блокирует iframe.** В `next.config.ts` Content-Security-Policy/frame-src не задан. Текущий блокер возникает раньше, на DNS.
4. **HYPOTHESIS_REJECTED: AniList ID ошибочно отправляется как Kodik ID.** Текущий runtime берёт `Anime.malId` и отправляет его как `shikimori_id`; внутренний Prisma ID и slug не отправляются.
5. **NOT_REPRODUCED: утечка токена в browser/client bundle.** Клиентских импортов сервиса и `NEXT_PUBLIC_` переменной не найдено; логи и отчёты не содержат полный токен.
6. **HYPOTHESIS_REJECTED: ReportLab уже доступен в runtime.** Импорт завершился `ModuleNotFoundError`; локальная установка не нашла пакеты из-за недоступного package index.
7. **HYPOTHESIS_REJECTED: Edge headless сможет напечатать PDF.** Процесс заблокирован Windows sandbox с `Access denied` при создании IPC/crashpad. Итоговый PDF создан автономным генератором и проверен Windows PDF engine.

## 8. Изменённые файлы

| Файл                                         | Назначение                  | Изменение                                                                      |
| -------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------ |
| `src/server/services/kodik.service.ts`       | Runtime Kodik               | Статусы, retry, timeout, schema, нормализация, safe logging, base URL, no mock |
| `src/server/services/kodik.service.test.ts`  | Unit tests                  | 15 сценариев ошибок, security, translation и embed validation                  |
| `src/app/watch/[slug]/[episode]/page.tsx`    | Watch resolver              | Удалён универсальный чужой embed; учитывается provider flag и реальный URL     |
| `scripts/provider-kodik-diagnose.ts`         | Read-only CLI               | Селекторы, локальные ID, JSON/table output, exit codes                         |
| `package.json`                               | npm scripts                 | Добавлена команда `providers:kodik:diagnose`                                   |
| `docs/providers/kodik.md`                    | Документация                | Актуализированы статусы и CLI                                                  |
| `scripts/generate-kodik-diagnostics-pdf.py`  | PDF generator               | Автономная генерация PDF с embedded Arial/Unicode без внешних пакетов          |
| `reports/kodik-integration-diagnostics.html` | Альтернативный print source | Стилизованный HTML source; Edge print был заблокирован sandbox                 |
| `reports/kodik-integration-diagnostics.*`    | Отчёты                      | Markdown, JSON и PDF диагностики                                               |

Prisma schema и миграции не менялись.

## 9. Выполненные команды

```text
rg --files ...
rg -n -i "KODIK|kodikapi|shikimori_id|..." ...
node --env-file-if-exists=.env --env-file-if-exists=.env.local (safe env check)
node (read-only Prisma sample queries)
node (DNS/TLS/HTTP diagnostics without printing token)
npm run providers:kodik:diagnose -- --anilist-id=16498 --season=1 --episode=1 --json
npx eslint ...
npm run typecheck
npm test
npm run lint
npm run dev
Invoke-WebRequest http://127.0.0.1:3000/anime/anilist-269-bleach
Invoke-WebRequest http://127.0.0.1:3000/watch/anilist-269-bleach/1?season=1
npm run build
npm run build -- --webpack
python -m pip install --target .data/pdfdeps reportlab pypdf pdfplumber
msedge --headless --print-to-pdf=reports/kodik-integration-diagnostics.pdf ...
python scripts/generate-kodik-diagnostics-pdf.py
Windows.Data.Pdf render-to-PNG validation (18/18 pages)
```

Ни одна команда не содержала токен в аргументах или выводе.

## 10. Результаты тестов

| Проверка                    | Результат                                                                       |
| --------------------------- | ------------------------------------------------------------------------------- |
| TypeScript `tsc --noEmit`   | PASS                                                                            |
| ESLint изменённых файлов    | PASS                                                                            |
| Полный `npm run lint`       | PASS                                                                            |
| Kodik unit tests            | PASS, 15/15                                                                     |
| Полный test suite           | PASS, 143/143                                                                   |
| Diagnostic CLI              | Корректный `NETWORK_ERROR`, exit code 4, ENOTFOUND, 3 bounded attempts          |
| Dev server `/`              | HTTP 200                                                                        |
| Anime page Bleach           | HTTP 200, 382970 bytes                                                          |
| Watch page Bleach episode 1 | HTTP 200, unavailable/local player state, Kodik iframe отсутствует              |
| Browser console/Network     | BLOCKED: browser runtime unavailable                                            |
| Production build Turbopack  | Compilation PASS, затем environment `spawn EPERM`                               |
| Production build webpack    | `spawn EPERM` до компиляции; системное ограничение повторилось                  |
| PDF open/page count         | PASS, Windows PDF engine, 18 pages                                              |
| PDF render                  | PASS, 18/18 PNG pages                                                           |
| PDF visual QA               | PASS after one iteration; кириллица, margins, page numbers и wrapping корректны |

`spawn EPERM` зафиксирован как ограничение среды. Он не воспроизводится в `tsc`, lint, tests или dev server.

## 11. Сетевой отчёт

| Target              | DNS       | TLS      | HTTP     |               Duration | Вывод                             |
| ------------------- | --------- | -------- | -------- | ---------------------: | --------------------------------- |
| `kodikapi.com`      | ENOTFOUND | не начат | не начат | DNS 68 ms, fetch 39 ms | API недоступен из текущей сети    |
| `kodik.info` iframe | ENOTFOUND | не начат | не начат |  DNS 48 ms, fetch 3 ms | iframe недоступен из текущей сети |

Публичные источники недавно наблюдали DNS-записи `kodikapi.com`, поэтому результат классифицирован как локальная/региональная/временная DNS-недоступность, а не доказанное закрытие домена. IP-адреса в отчёт намеренно не включены. CORS не относится к API-запросу, поскольку он выполняется на сервере. Redirect chain, remote X-Frame-Options и внутреннее видео нельзя проверить до DNS resolution.

## 12. Кеширование

Runtime использует `cache: "no-store"`; следовательно 401/403/NOT_FOUND не сохраняются как успешные результаты и stale embed не хранится. Недостаток: повторные server renders могут повторять запрос. Рекомендуется позже добавить серверный outcome-aware cache: умеренный TTL для OK, короткий для NOT_FOUND, без долгого cache для auth/network/schema.

## 13. Риски

- Внешний DNS/API и региональная доступность Kodik.
- Неподтверждённый официальный контракт и права iframe playback.
- Изменение схемы и nullable-полей upstream.
- Rate limits и нестабильность embed URL.
- MAL/Shikimori соответствие и отсутствие отдельного Shikimori ID в БД.
- Отсутствие outcome-aware cache.
- Не настроенный allowlist embed hosts.
- Токен хранится в query string upstream API по существующему контракту; sanitization обязателен.

## 14. Рекомендации

### Немедленные

1. Проверить `Resolve-DnsName kodikapi.com` и `Resolve-DnsName kodik.info` в разрешённой сети без VPN/proxy обхода.
2. Получить у Kodik подтверждённые endpoint, параметры, allowlist доменов, права токена и письменное разрешение embed.
3. Не включать `KODIK_PLAYBACK_ENABLED`, пока allowlist и права не подтверждены.

### Ближайшие

1. После восстановления DNS повторить CLI для матрицы из восьми тайтлов.
2. Подтвердить фактическую схему на sanitized sample и расширить fixture tests.
3. Проверить iframe в реальном браузере: Console, Network, X-Frame-Options, CSP и start playback.
4. Добавить outcome-aware server cache и наблюдаемость без секретов.

### Долгосрочные

1. Хранить подтверждённые provider links и match confidence через существующие media-provider модели.
2. Добавить ручной review для ambiguous matches, если официальный API разрешит title search.
3. Добавить CI egress/DNS health check отдельно от unit tests.

## 15. Нерешённые вопросы и следующий шаг

- **DNS/API:** повторить диагностику в сети, где домены разрешаются.
- **AUTH:** после DNS проверить HTTP status; текущий токен ещё не валидирован upstream.
- **PLAYBACK:** получить разрешение и домены, затем задать `KODIK_PLAYBACK_ENABLED=true` и `KODIK_ALLOWED_EMBED_HOSTS=...`.
- **Browser:** повторить ручную проверку watch page в Chrome/Edge.
- **Build:** повторить `npm run build` вне sandbox, разрешив Node создавать дочерние процессы.

## 16. Финальный вывод

**Интеграция работает частично и заблокирована внешней DNS-недоступностью; для реального playback также требуется ручная конфигурация и подтверждение прав.**

Серверный код теперь корректно различает исходы, не выдаёт mock за настоящий релиз, не раскрывает токен и не обрушает страницу. Нельзя утверждать, что токен, поиск релизов и воспроизведение реально работают, пока запрос не достигнет Kodik API и выбранный release не будет проверен против нужного аниме.

### Повторный запуск

```powershell
npm run providers:kodik:diagnose -- --anilist-id=16498 --season=1 --episode=1 --json
npm run dev
```
