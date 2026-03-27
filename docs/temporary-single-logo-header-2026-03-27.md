# Временное production-исключение: single-logo header

Статус: временное production-исключение, подтверждённое пользователем `2026-03-27`.

Цель: на время убрать из global header логотипный блок `Знание` и оставить только фестивальный логотип `80 историй о главном`, сохранив быстрый возврат к предыдущему dual-logo состоянию.

## Основание

- Пользователь подтвердил временное отклонение от текущего dual-logo канона header.
- Базовый канон header-логотипа описан в [docs/hero-requirements.md](/workspaces/kdg80/docs/hero-requirements.md).
- До введения этого исключения текущая точка возврата зафиксирована тегом Git `pre-single-logo-header-20260327`.

## Временные требования

- В global header остаётся один логотип: только `80 историй о главном`.
- Стилизованная графитовая `З` и отдельный compact-logo `Знание` временно не показываются в header на production и preview.
- Header использует один стабильный логотипный слот без смены ширины между состояниями `top` и `scrolled`.
- Новый header-logo строится из существующего festival SVG с удалением графитового знака и обрезкой пустого левого пространства.
- Визуальный якорь логотипа должен оставаться слева; пустой хвост перед знаком `80` недопустим.

## Acceptance

- Desktop: логотип визуально начинается от левого края слота, без пустого поля перед знаком `80`.
- Desktop: после удаления `Знание` header не выглядит перекошенным, `По интересам` и `Программа` не уезжают.
- Mobile: логотип целиком помещается в header без обрезания.
- Mobile: `Темы` и `Программа` не прыгают по оси X при переходе `top -> scrolled -> top`.
- На desktop и mobile в header нет второго логотипного состояния и нет возврата к `Знание` при скролле.

## Технический объём

- Исходный asset для сборки: [assets/logo-festival-single.svg](/workspaces/kdg80/assets/logo-festival-single.svg)
- Сгенерированный public asset после build/deploy: `shared-assets/logo-festival-single.svg`
- Header component: [site/src/components/SiteHeader.astro](/workspaces/kdg80/site/src/components/SiteHeader.astro)
- Header styles: [site/src/styles/global.css](/workspaces/kdg80/site/src/styles/global.css)
- SEO и GEO сущности не меняются; временное исключение ограничено визуальным header-слоем.

## Быстрый возврат

- Точка возврата до single-logo изменений: Git tag `pre-single-logo-header-20260327`
- Безопасный сценарий отката после отдельного коммита: `git revert <commit>`
- Повторное включение single-logo после revert: `git cherry-pick <commit>`

## Preview / visual evidence

- Перед production-выкладкой обязателен preview на `kgd80.ru/preview-.../`
- Обязательны Playwright-проверки desktop и mobile
- Скриншоты и preview URL должны быть добавлены в финальную запись по задаче перед production-выкладкой
- Актуальный preview URL: `https://kgd80.ru/preview-20260327-single-logo-header/`
- Live screenshot artifacts:
  - `tmp/single-logo-preview-live/desktop-top.png`
  - `tmp/single-logo-preview-live/desktop-scrolled.png`
  - `tmp/single-logo-preview-live/mobile-top.png`
  - `tmp/single-logo-preview-live/mobile-scrolled.png`
- Live geometry check на preview:
  - Desktop `top` и `scrolled`: logo width `236`, nav x `773.3`, CTA x `1294.66`
  - Mobile `top` и `scrolled`: logo width `152.09`, nav x `186.17`, CTA x `274.48`
  - На preview не найдено текста `Российское общество Знание` или отдельного header-логотипа `ЗНАНИЕ`
