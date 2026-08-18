# Kairo — техническая спецификация дизайна Home

Статус: **эталон для переноса визуального языка на остальные страницы**.
Источник истины: текущая реализация `/` в `src/app/page.tsx`, home-компоненты, глобальные токены и WebGL-слой.
Дата фиксации: 2026-08-18.

## 1. Визуальная идея

Home использует тёмную cinematic-эстетику: почти чёрный сине-зелёный фон, холодные бирюзовые акценты, молочно-белый основной текст, полупрозрачные стеклянные поверхности и очень мягкие тени. Контраст строится не на ярких цветах, а на светлоте, прозрачности и глубине слоёв.

Обязательные признаки стиля Kairo:

- фон всегда тёмный, холодный и многослойный;
- главный акцент — приглушённый cyan/teal, не насыщенный синий;
- заголовки — лёгкий serif, интерфейс — нейтральный sans-serif, служебные индексы — monospace;
- рамки тонкие (1px) и малоконтрастные;
- поверхности полупрозрачные, без тяжёлого «глянцевого» glassmorphism;
- движение короткое и сдержанное; scroll-curl является фирменным эффектом;
- декоративные орбиты, дымка, сетка и звёзды не должны мешать чтению.

## 2. Архитектура Home

Порядок слоёв и блоков:

1. Глобальный фиксированный фон `.app-background` с hero-изображением, градиентами, горизонтальной сеткой и орбитами.
2. Фиксированный header с прозрачностью и blur.
3. Hero: eyebrow, двухстрочный H1, описание, underline-CTA, индекс `01 KAIRO / HOME`.
4. Canvas-звёзды и редкие метеоры внутри hero.
5. «Популярное» — стеклянная секция с сеткой постеров.
6. Вторичная сетка: «Продолжить просмотр» + «Ближайшие релизы».
7. «Аниме текущего сезона» — открытая секция без стеклянной рамки.
8. Footer.
9. По действию пользователя: modal истории или календаря релизов.

Основная ширина контента: `min(100% - 2 × gutter, 108rem)`. Home-gutter: `clamp(1rem, 4vw, 4rem)`.

## 3. Цветовая система

### 3.1. Базовые токены

| Роль | Значение | Применение |
|---|---:|---|
| Root background | `#080c0e` | `body`, общий fallback |
| Elevated background | `#0e1416` | приподнятые поверхности |
| Muted background | `#11191b` | skeleton/fallback |
| Solid surface | `#141c1e` | непрозрачная поверхность |
| Card surface | `rgba(20, 28, 30, .78)` | стандартная карточка |
| Card hover | `rgba(27, 37, 39, .88)` | hover поверхности |
| Overlay | `rgba(3, 7, 8, .78)` | затемнение/оверлей |
| Primary text | `#f0f2ef` | основной текст |
| Secondary text | `#9aa6a5` | описание, meta |
| Muted text | `#667170` | вторичная служебная информация |
| Inverse text | `#111719` | текст на светлой кнопке |
| Accent | `#b9d9d3` | общий cyan-accent |
| Focus | `#cce8e3` | focus-visible outline |
| Border | `rgba(226, 239, 235, .12)` | стандартная рамка |
| Strong border | `rgba(226, 239, 235, .22)` | hover/активная рамка |
| Success | `#8fc9b9` | успешное состояние |
| Warning | `#d8b878` | предупреждение |
| Danger | `#d78b7b` | ошибка/опасное действие |

### 3.2. Home-specific палитра

| Роль | Значение |
|---|---:|
| Cinematic base | `#0a1b1e`, `#09191c`, `#071416` |
| Hero title | `#eef5f4` |
| Hero body | `#afc1c0` |
| Eyebrow | `#91cfd0` |
| CTA text | `#e5f1f0` → hover `#ffffff` |
| CTA underline | `rgba(121,191,192,.62)` → `#a2dcdd` |
| Section title/card title | `#eef5f4` / `#edf5f4` |
| Section description | `#9fb2b1` |
| Secondary action | `#bfd0cf` → `#f1f6f5` |
| Muted card metadata | `#718887`, `#78908e`, `#879b9a`, `#8fa4a3` |
| Progress accent | `#79bfc0` |
| Rating | `#c9b98d` (локально также `#d8c28e`) |
| Modal background | `#102d30` |
| Modal title/text | `#edf5f4` |

Правило переноса: сначала использовать semantic-токены из `tokens.css`. Home-specific hex/rgba разрешены для cinematic-декора и тонкой настройки контраста, но не должны порождать новую несвязанную палитру.

### 3.3. Семантические статусы

- airing/releasing: рамка `rgba(126,211,188,.36)`, текст `#c9eee4`;
- finished: нейтральная рамка `rgba(184,194,201,.28)`;
- not yet released: рамка `rgba(219,179,116,.38)`, текст `#f0d6a9`;
- hiatus/cancelled: рамка `rgba(199,125,104,.38)`, текст `#e4b0a2`.

## 4. Фон и атмосферные эффекты

### Глобальный cinematic-фон

- фиксирован на весь viewport (`position: fixed`, `100dvh`), не принимает pointer events;
- база: `#0a1b1e`;
- три фоновых слоя: вертикальное затемнение, teal-свечение справа сверху, более слабое свечение слева;
- hero-изображение: `/images/home/kairo-cinematic-hero-v2.png`, `cover`, позиция около `69% 38%`;
- изображение приглушено: `opacity: .48`, `saturate(.82) contrast(.9) brightness(1.03)`;
- левый край изображения растворяется mask-gradient;
- поверх изображения — горизонтальные линии с шагом `7rem`, opacity `.2`, ограниченные вертикальной маской;
- две декоративные окружности с рамкой `rgba(185,217,211,.07)`.

Это декоративный слой. На внутренних страницах допустимо менять позицию/силу изображения, но сохранять цветовую температуру, низкий контраст и читаемость текста.

### Glass-эффект

Glass в Kairo состоит из четырёх признаков:

1. тёмная полупрозрачная заливка;
2. тонкая светлая рамка 1px с alpha примерно `.08–.22`;
3. умеренный blur только там, где за поверхностью реально есть изображение/контент;
4. мягкая тень без яркого ореола.

Эталон header: `rgba(9,25,28,.42)`, border `rgba(130,200,200,.13)`, `backdrop-filter: blur(8px)`. После scroll: `rgba(8,12,14,.86)`, blur `18px`. Эталон модального backdrop: `rgba(2,12,15,.7)` + blur `3px`.

## 5. Типографика

| Роль | Шрифт | Размер/параметры |
|---|---|---|
| Display/H1/H2 | `Georgia, Times New Roman, serif` | вес 400, tight tracking |
| UI/body | `Inter, Segoe UI, system-ui, sans-serif` | стандартный интерфейс |
| Индексы | `SFMono-Regular, Consolas, monospace` | служебная маркировка |
| Hero H1 | display | `clamp(2.8rem, 3.45vw, 4.15rem)`, line-height `.94`, letter-spacing `-.055em` |
| Mobile H1 | display | `clamp(2.5rem, 10.5vw, 4rem)`, line-height `.98` |
| Section H2 | display | `clamp(1.5rem, 2.1vw, 2.15rem)`, line-height `1.08` |
| Eyebrow | UI uppercase | `.65rem`, weight 650, tracking `.22em` |
| Hero description | UI | `clamp(.875rem, 1.1vw, 1rem)`, line-height `1.75`, max `28rem` |
| CTA/action | UI uppercase | `.68–.75rem`, tracking `.08em` |
| Card title | UI | примерно `.78–.96rem`, 2 строки max |
| Meta | UI | `.52–.65rem`, muted |

Нельзя: тяжёлые display-веса, ярко-белый body-copy на всех уровнях, большие uppercase-блоки. Uppercase предназначен для eyebrow, CTA, status и служебных подписей.

## 6. Геометрия и поверхности

- Radius scale: `8px`, `12px`, `18px`, `24px`, `32px`, pill `999px`.
- Основные home-панели: radius `18px`, padding `clamp(1.25rem, 2.2vw, 2rem)`.
- Panel background: вертикальный gradient `rgba(28,57,60,.46)` → `rgba(11,32,35,.30)` плюс едва заметное верхнее radial-свечение.
- Panel border: `rgba(130,200,200,.085)`.
- Panel shadow: inset highlight + `0 1.25rem 4rem rgba(0,0,0,.055)`.
- Постер: aspect ratio примерно `.71`/`2:3`, radius `12px`, border 1px.
- Continue card: landscape art, затем текстовый нижний блок и progress 3px.
- Play-control: круг; светлый `rgba(225,241,240,.94)`, тёмная иконка `#102629`.
- Минимальная интерактивная высота: 44–52px; hero CTA — 52px, section action — 48px.

## 7. Интерактивные состояния

### Links и actions

- underline-CTA не получает заполненную кнопку: меняются цвет, border и gap;
- hero CTA: gap `.75rem` → `1rem`;
- section action: gap `.55rem` → `.8rem`;
- disabled action: `#617775`, слабая рамка, без движения;
- `:focus-visible`: outline `2px solid #b9d9d3`, offset `4px`, radius `6px`.

### Карточки

- AnimeCard lift: `-3px` на Home (`compactHover`), transition `.3s`;
- poster hover: brightness `1.045`, image scale `1.012`, чуть сильнее border/shadow;
- save-button появляется по hover/focus: opacity `0→1`, translateY `-5px→0`;
- Continue card: `translateY(-2px)`, более светлые background и border;
- release row: отрицательный внешний отступ `.5rem`, внутренний padding `.5rem`, background `rgba(39,76,79,.22)`.

## 8. Motion и анимации

### Общие motion-токены

- fast: `180ms`;
- normal: `360ms`;
- slow: `600ms`;
- standard easing: `cubic-bezier(.2,0,0,1)`;
- emphasized easing: `cubic-bezier(.22,1,.36,1)`.

### Звёздное поле hero

- Canvas покрывает hero, не принимает события и маскируется справа после 45–68%;
- 56 звёзд на Full HD, минимум 24; количество масштабируется по корню площади viewport;
- цвет звезды `rgba(202,244,247, alpha)`, cyan glow `rgba(135,224,230,.42)`;
- opacity базово `.10–.35`, мерцание ±18%;
- дрейф: до нескольких px по X/Y, очень медленный;
- метеор появляется случайно каждые 5–14 секунд;
- длина 50–140px, длительность 600–1200ms, угол примерно `.55–.75 rad`;
- reduced motion: статичные звёзды, без метеора и requestAnimationFrame-loop.

### Scroll-curl («гибкий лист»)

Фирменный эффект активен только внутри `KairoWebGLSurface`: Home Popular, Continue Watching и Current Season.

- изображения рендерятся в фиксированном WebGL canvas поверх DOM;
- DOM остаётся источником размеров, responsive-layout, ссылок и accessibility;
- distortion зависит от скорости прокрутки, а не от времени;
- max curl `0.072`;
- attack `25ms`, release `175ms`, нормализация скорости: saturation около `800px/s`;
- центр viewport почти нейтрален, верх/низ сжимаются сильнее;
- множители: image `1`, surface `.55`, text `.25`;
- текст получает только мягкие translate X/Y + scaleX, чтобы не снижать читаемость;
- сохраняются `object-fit: cover`, border-radius и sRGB color pipeline;
- WebGL failure/context loss/texture failure возвращает обычное DOM-изображение;
- reduced motion полностью выключает curl и оставляет native/static presentation.

Не подключать scroll-curl к header, controls, modal, player, формам, skeleton, fixed background и длинным текстовым блокам.

### CSS-анимации

| Анимация | Параметры | Назначение |
|---|---|---|
| `home-pulse` | `1.5s ease-in-out infinite alternate` | skeleton/placeholder opacity до `.48` |
| `progress-in` | `.9s emphasized` | рост progress по X от 0 |
| `empty-haze` | `7s ease-in-out infinite alternate` | медленный drift/scale дымки empty state |
| `empty-orbit` | `9s ease-in-out infinite alternate` | малое изменение наклона орбиты |
| `backdrop-in` | `.2s ease both` | fade модального backdrop |
| `modal-in` | `.22s ease both` | opacity + `translateY(12px) scale(.985)` |
| `shimmer` | `1.2s infinite` | loading календаря |

## 9. Responsive-контракт

### Desktop ≥ 1024px

- hero min-height: `clamp(39rem, 100svh - 5rem, 58rem)`;
- copy занимает 42%, начинается примерно на `11–15.5rem` сверху;
- Popular: 6 колонок;
- secondary layout: `2fr / 1fr`, правая колонка минимум `18rem`.

### Tablet 768–1023px

- hero: минимум `78svh`;
- copy: `min(35rem, 72%)`;
- Popular: 4 колонки, элементы 5+ скрыты;
- secondary layout становится одноколоночным.

### Mobile < 768px

- hero: `max(38rem, 82svh)`;
- copy на всю ширину, H1 fluid до `10.5vw`;
- home content занимает 100% ширины;
- стеклянные секции теряют боковые border и radius, padding сохраняется через gutter;
- Popular и Continue становятся горизонтальными scroll-snap рядами;
- Current Season остаётся обычной сеткой 2 колонки;
- модальные окна превращаются в bottom sheet: ширина 100%, высота `90dvh`, только верхние скругления;
- вторичная metadata может скрываться, но title/action остаются доступными.

## 10. Состояния данных

Каждый блок обязан иметь законченные состояния:

- loading: skeleton с фиксированной геометрией, без layout shift;
- empty: декоративная орбита/луна/дымка, но без вымышленных данных;
- error: короткое объяснение и retry там, где повторный запрос возможен;
- disabled: визуально отличается и не реагирует на hover;
- success: реальные изображения; до готовности WebGL виден DOM fallback.

## 11. Accessibility и производительность

- декоративные canvas, индекс, орбиты и watermark имеют `aria-hidden`;
- section связывается с H2 через `aria-labelledby`;
- icon-only controls имеют доступный label;
- после закрытия modal focus возвращается на trigger;
- modal блокирует фон, закрывается Escape и удерживает focus;
- `prefers-reduced-motion` отключает Canvas-loop, curl, modal motion, pulse/shimmer и декоративные keyframes;
- большие blur/filter не анимируются;
- WebGL применяется только к явно отмеченным визуальным поверхностям;
- горизонтальный overflow разрешён только локальным mobile-скроллерам.

## 12. Чек-лист для новых страниц

### Основа

- [ ] Использован root background `#080c0e` и холодный cinematic ambient layer.
- [ ] Контент ограничен `108rem`, gutter fluid `1–4rem`.
- [ ] Основной текст молочно-белый, secondary/meta заметно приглушены.
- [ ] Accent взят из cyan/teal-системы, без нового яркого brand-color.
- [ ] Все border — 1px и alpha-based.

### Типографика

- [ ] Главный и секционные заголовки используют display serif, weight 400.
- [ ] UI/body использует sans-serif; индексы — mono.
- [ ] Uppercase применяется только к служебным коротким строкам.
- [ ] Длинные title имеют line-clamp/ellipsis и `min-width: 0`.

### Поверхности и эффекты

- [ ] Glass содержит dark alpha fill + subtle border + умеренный blur + мягкую shadow.
- [ ] Radius выбран из общей scale.
- [ ] Hover не превышает lift 2–3px для компактных карточек.
- [ ] Scroll-curl подключён только к изображениям/визуальным карточкам, если он улучшает композицию.
- [ ] Для WebGL есть DOM fallback.
- [ ] Декор не перехватывает pointer events и не уменьшает контраст текста.

### Motion

- [ ] Основные transitions используют 180/360/600ms и системные easing.
- [ ] Нет бесконечной активной анимации, кроме очень медленного ambient или loading-state.
- [ ] Реализован `prefers-reduced-motion`.
- [ ] Не анимируются blur, тяжёлые shadow и layout-свойства больших областей.

### Responsive и состояния

- [ ] Проверены desktop ≥1024, tablet 768–1023, mobile <768.
- [ ] Touch-target не меньше 44px; ключевые CTA 48–52px.
- [ ] На mobile панели корректно становятся edge-to-edge или horizontal scroll-snap.
- [ ] Есть loading, empty, error, disabled и success состояния без layout shift.
- [ ] Focus-visible, клавиатура, modal focus return и aria-связи сохранены.

## 13. Что является активным, а что legacy

В `HomeFoundation.module.css` остались классы `.atmosphere`, `.horizon`, `.orbit`, `.artwork`, но текущий `HomeFoundation.tsx` их не рендерит. Они **не являются частью действующего визуального контракта**. Активная атмосфера Home приходит из глобального `.app-background`, `HeroStarField` и текущих секций.

Комментарии о старых вариантах hero в конце `globals.css` также не следует считать отдельными требованиями. При разработке новых страниц ориентироваться на реальные компоненты и правила этой спецификации.

## 14. Файлы-источники

- `src/styles/tokens.css` — semantic tokens;
- `src/app/globals.css` — глобальный фон, header, общие cards/posters/footer;
- `src/components/home/HomeFoundation.tsx` и `.module.css` — hero;
- `src/components/home/HomeSections.tsx` и `.module.css` — секции и состояния;
- `src/components/home/HeroStarField.tsx` — звёзды и метеоры;
- `src/components/home/*Modal.module.css` — modal/glass/bottom-sheet;
- `src/components/webgl/images/*` — shader и scroll-curl;
- `src/components/webgl/dom-curl/*` — синхронизация мягкой деформации DOM-текста.
