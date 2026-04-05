# Weekly Mobile Story Playbook

Статус формата: `working`
Статус реализации: `in progress`
Статус подтверждения пользователем: `not confirmed`
Последнее обновление: `2026-04-05`
Связанный preview-route: `/video-story/`
Связанный канон: [video-announcement-concept-2026-03-27.md](/workspaces/kdg80/docs/video-announcement-concept-2026-03-27.md)

## Назначение

Это рабочий playbook для короткого weekly mobile story ролика о событиях ближайшей недели. Его задача: быстро обновлять weekly-story deliverable без повторного изобретения формата, safe-area, очередности сцен, motion-логики и render-пайплайна.

## Каноническая спецификация

- Canvas: `1080x1920`, `9:16`, vertical full-screen story.
- Safe area для критичного текста и интерфейсного слоя: примерно `250 px` сверху и `340 px` снизу.
- Основной export: `30 fps`, `H.264`, `AAC`, `mp4`, `playback-safe`.
- Аудио добавляется отдельным шагом; render-script поддерживает offset через `--audio-start-seconds`.
- Интро использует hero-lockup фестиваля и wording `Анонс недели`.

## Базовая очередность сцен

1. `week-intro`
2. event-сцены недели строго в хронологическом порядке
3. `week-site`
4. `week-telegram`
5. `week-max`

## Непереговорные композиционные правила

- В кадре всегда один главный объект внимания.
- Event-сцена должна вести зрителя в порядке: `дата и время -> название -> спикер и регалии`.
- Motion не может замирать раньше конца readable-beat: фон, камера и портрет должны держать мягкий непрерывный drift до конца сцены.
- Фото обязано оставаться full-bleed без чёрных полей и видимых краёв исходника.
- Split-плоскость не может визуально разрезать спикера по лицу или корпусу.
- Дата и время читаются крупно; площадка пишется institution-first:
  - первая строка: музей / библиотека / институция;
  - вторая строка: корпус / зал и адрес.
- Regalia спикера допускается располагать поверх фигуры, если это улучшает читаемость и не создаёт ощущения, что спикера режут плоскости.

## Site CTA

- `KGD80` живёт на светлом поле графитом.
- `.RU` живёт белым на терракотовом поле.
- Домен читается как единый seam-CTA жест, а не как две разрозненные строки.
- Доменный блок располагается в средней или нижней половине кадра.

## Где менять weekly-story

- Scene data, порядок, duration, location naming, text: [video-story-scenes.ts](/workspaces/kdg80/site/src/lib/video-story-scenes.ts)
- Layout, split geometry, motion, type system, scene layering: [scene.astro](/workspaces/kdg80/site/src/pages/video-story/[scene].astro)
- Playbook route: [index.astro](/workspaces/kdg80/site/src/pages/video-story/index.astro)
- Capture verification: [capture_video_story_weekly.mjs](/workspaces/kdg80/site/scripts/capture_video_story_weekly.mjs)
- Final render: [render_video_story_weekly.mjs](/workspaces/kdg80/site/scripts/render_video_story_weekly.mjs)

## Рабочий цикл

1. Обновить weekly scene seeds и тексты.
2. Проверить отдельные сцены через `/video-story/<scene>/`.
3. Собрать статический preview.
4. Снять desktop/mobile capture.
5. Проверить intro, event hero, bridge-scene, site CTA и оба QR.
6. Собрать финальный mp4 без звука или со звуком и offset.

## Команды

```bash
cd /workspaces/kdg80/site
npm run build
```

```bash
cd /workspaces/kdg80/site
VIDEO_STORY_PORT=4327 node scripts/capture_video_story_weekly.mjs
```

```bash
cd /workspaces/kdg80/site
node scripts/render_video_story_weekly.mjs \
  --profile=playback-safe \
  --quality=high \
  --fps=30 \
  --tag=next-week-20260406-20260412
```

```bash
cd /workspaces/kdg80/site
node scripts/render_video_story_weekly.mjs \
  --profile=playback-safe \
  --quality=high \
  --fps=30 \
  --tag=next-week-20260406-20260412 \
  --audio='/workspaces/kdg80/Исходные данные/The_xx_-_Intro.mp3' \
  --audio-start-seconds=19
```

## Visual verification checklist

- Интро использует именно hero-lockup фестиваля.
- Ни одна scene не замирает до перехода.
- Дата и время заметны с первого чтения.
- Локация не превращается в тяжёлую непрозрачную плашку.
- Seam white/red не режет спикера.
- `KGD80.RU` читается одним доменом и проходит по split-линии корректно.
- QR-коды и их подписи сидят внутри safe-area.
- На mobile и desktop preview нет случайного клиппинга текста или чёрных полей у фото.
