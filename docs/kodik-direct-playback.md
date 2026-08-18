# Прямое воспроизведение Kodik в Kairo

## Назначение

Kairo преобразует ссылку на страницу плеера Kodik в набор HLS-источников и
воспроизводит их через собственный `KairoPlayer` и Shaka Player. Интерфейс
Kodik не показывается в штатном режиме. Iframe сохранён только как аварийный
fallback на случай изменения формата страницы или API Kodik.

## Поток данных

1. Kodik API возвращает `playerLink` для выбранного перевода и серии.
2. `KodikWatchPlayer` отправляет `playerLink` в `POST /api/kodik/streams`.
3. Сервер проверяет протокол, hostname и структуру URL.
4. Сервер загружает страницу плеера и находит `app.player_single.*.js`.
5. Из player script извлекается актуальный Base64-encoded endpoint.
6. Сервер запрашивает video info и декодирует обфусцированные источники.
7. Клиент собирает HLS master playlist из вариантов качества.
8. Shaka Player загружает master playlist, управляет ABR и ручным качеством.
9. Тайминги `skipButtons` преобразуются в главы Kairo.

## Серверный API

### `POST /api/kodik/streams`

Запрос:

```json
{
  "playerLink": "https://kodikplayer.com/video/91873/hash/720p",
  "forceRefresh": false
}
```

Успешный ответ:

```json
{
  "sources": [
    {
      "quality": 360,
      "url": "https://cdn.example/360.mp4:hls:manifest.m3u8",
      "mimeType": "application/x-mpegURL"
    },
    {
      "quality": 720,
      "url": "https://cdn.example/720.mp4:hls:manifest.m3u8",
      "mimeType": "application/x-mpegURL"
    }
  ],
  "chapters": [
    {
      "id": "kodik-intro-0",
      "title": "Заставка",
      "startTime": 12,
      "endTime": 86,
      "type": "intro"
    }
  ],
  "translation": { "id": 869, "title": "Субтитры" },
  "expiresAt": "2026-08-18T19:30:00.000Z"
}
```

Возможные ошибки:

- `400 INVALID_PLAYER_LINK` — URL не принадлежит разрешённому Kodik-host или
  имеет неподдерживаемую структуру;
- `413 REQUEST_TOO_LARGE` — тело запроса превышает лимит;
- `429 RATE_LIMITED` — превышено 30 запросов в минуту для одного адреса;
- `502 PLAYER_UNAVAILABLE` — страница или player script недоступны;
- `502 PLAYER_FORMAT_CHANGED` — изменился формат endpoint;
- `502 VIDEO_INFO_UNAVAILABLE` — video endpoint недоступен;
- `502 VIDEO_INFO_INVALID` — ответ нельзя декодировать;
- `502 NO_STREAMS` — Kodik не вернул пригодные источники.

## Кэширование и восстановление

- HLS sources кэшируются на сервере 5 минут.
- Обнаруженный endpoint кэшируется 6 часов для конкретного player script.
- Каждый внешний запрос ограничен таймаутом 8 секунд.
- После фатальной ошибки Shaka клиент один раз выполняет запрос с
  `forceRefresh: true`.
- Если обновлённый источник также не воспроизводится, включается iframe
  fallback.
- Прямые CDN URL не записываются в базу и не должны попадать в логи.

## Безопасность

Resolver принимает только HTTPS player links на известных доменах:

- `kodikplayer.com`;
- `kodik.info`;
- `kodik.cc`;
- `aniqit.com`;
- их поддомены.

Redirect страницы, player script или video endpoint на другой origin
отклоняется. Извлечённый endpoint обязан быть относительным path. Это не даёт
публичному API превратиться в произвольный server-side fetch proxy.

Если Kodik начнёт использовать новый домен, его следует добавить только после
проверки реального player URL и DNS назначения.

## Эксплуатационная проверка

```powershell
npm run typecheck
npm run lint -- --max-warnings=0
node --experimental-strip-types --test --test-isolation=none `
  src/server/services/kodik/direct-streams.test.ts
```

Для ручной проверки открыть материал Kodik и убедиться, что:

1. в DOM используется `<video>`, а не iframe;
2. Network содержит HLS master, rendition manifest и `.ts`-сегменты;
3. меню качества показывает все возвращённые варианты;
4. кнопка пропуска появляется в заданном диапазоне;
5. прогресс сохраняется с правильным сезоном и серией;
6. синхронизация watch-party управляет direct-player;
7. при искусственном `403/404` выполняется один refresh, затем fallback.

## Правовые ограничения

Техническая доступность HLS URL не предоставляет прав на показ или
распространение контента. Перед production-запуском необходимо отдельно
проверить договор с Kodik, условия API и права на используемые материалы.
