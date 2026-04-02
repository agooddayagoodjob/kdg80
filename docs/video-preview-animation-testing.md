# Video Preview Animation Testing Notes

Статус: `working memo`

Этот документ фиксирует практические правила проверки анимации в `video-preview`, которые уже всплыли в работе и не должны теряться между итерациями.

## Где искать

- Канонический файл: `/workspaces/kdg80/docs/video-preview-animation-testing.md`
- Быстрый route: `/video-preview/animation-testing/`
- Короткий alias route: `/video-preview/testing/`

## Базовый принцип

- Для композиции и текста недостаточно одного `still-desktop.png`.
- Для motion-проверки нельзя полагаться только на live wait по таймеру.
- Для projector-first сцен обязательно отдельно проверять:
  - desktop render кадра `1920x1080`;
  - mobile shell page;
  - ранние seek-фазы анимации;
  - финальный `mp4`, если менялся motion.

## Проверка через Playwright

### 1. Desktop stills

- Базовый захват сцен:

```bash
cd /workspaces/kdg80/site && node scripts/capture_video_preview.mjs <scene-slug>
```

- `still-desktop.png` полезен для оценки текста, иерархии, портретов и общей композиции.
- Для длинных сцен representative still может попасть не в hold-state, а в mid-animation, поэтому нужно смотреть ещё и `contact-sheet.webp`.

### 2. Mobile shell

- Для visual verification нужен отдельный mobile pass.
- Проверять надо не только `data-capture-root`, но и весь shell страницы, чтобы не пропустить переполнение, наезды или выпадение контента из layout.

### 3. Ранние seek-кадры

- Для проверки начала сцены нужно снимать явные кадры на нужных миллисекундах, например `0 / 400 / 900 / 1400 / 2100 / 2800 ms`.
- Это особенно важно для требований типа:
  - `в начале весь экран терракотовый`;
  - `до полной сборки спикеров не должно быть центральной границы`;
  - `спикеры собираются справа налево`.

## Важная ловушка

- Для motion-state capture нельзя использовать `animations: 'disabled'` как основной способ проверки.
- В нашем `video-preview` это может принудительно переводить CSS-анимации в конечное состояние и давать ложный кадр.
- Для честного seek-захвата нужно:
  - сначала вызвать встроенный API превью `pause()` и `seek(ms)`;
  - потом делать screenshot с `animations: 'allow'`.

Пример рабочего подхода:

```js
await page.waitForFunction(() => typeof window.__videoPreview?.seek === 'function');
await page.evaluate((timeMs) => {
  window.__videoPreview.pause();
  window.__videoPreview.seek(timeMs);
}, ms);
await page.waitForTimeout(40);
await captureRoot.screenshot({ path: outPath, animations: 'allow' });
```

## Встроенный preview API

На страницах `video-preview` доступен `window.__videoPreview` со следующими методами:

- `durationMs`
- `play()`
- `pause()`
- `restart()`
- `seek(ms)`

Если нужно проверить конкретную фазу анимации, сначала использовать этот API, а не ждать сцену только через `waitForTimeout`.

## Что проверять в public-talk motion

- title должен быть полным и совпадать с публичным названием события;
- дата должна читаться крупно и как один из двух главных объектов внимания;
- logo не должен конфликтовать с типографикой;
- ранние фазы не должны преждевременно вводить тёмный bank/divider;
- порядок появления спикеров нужно проверять именно по seek-кадрам, а не по одному итоговому still;
- после motion-правок нужен новый `mp4` sample, а не только png/webp артефакты.

## Рекомендуемый workflow

1. Изменить сцену.
2. Собрать проект.
3. Переснять desktop stills и contact sheet.
4. Снять ранние seek-кадры через `pause() + seek(ms) + animations: 'allow'`.
5. Снять mobile shell.
6. Сгенерировать новый `mp4` sample для затронутой сцены.
7. Только после этого считать motion-pass проверенным.
