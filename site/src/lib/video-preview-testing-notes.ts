export const videoPreviewTestingNotes = {
  title: 'Video Preview Animation Testing',
  eyebrow: 'WORKFLOW NOTES',
  description:
    'Памятка по честной проверке animation-state, seek-кадров, desktop stills, mobile shell и mp4 sample в video-preview.',
  canonicalDocPath: '/workspaces/kdg80/docs/video-preview-animation-testing.md',
  sections: [
    {
      title: 'Где искать',
      items: [
        'Канонический файл: /workspaces/kdg80/docs/video-preview-animation-testing.md',
        'Основной route: /video-preview/animation-testing/',
        'Короткий alias route: /video-preview/testing/',
      ],
    },
    {
      title: 'Что проверять',
      items: [
        'Desktop capture root 1920x1080 для композиции, текста и портретов.',
        'Contact sheet, потому что representative still у длинных сцен может попасть в mid-animation, а не в hold-state.',
        'Mobile shell, чтобы не пропустить переполнение и выпадение текста из layout.',
        'Ранние seek-фазы анимации, если есть требования к стартовому состоянию сцены.',
        'Новый mp4 sample, если менялся motion.',
      ],
    },
    {
      title: 'Ключевая ловушка',
      items: [
        'Для motion-state capture нельзя полагаться на animations: disabled как основной режим проверки.',
        'В video-preview это может перевести CSS-анимации в конечное состояние и дать ложный кадр.',
        'Для честного кадра нужно pause() + seek(ms), затем screenshot с animations: allow.',
      ],
    },
    {
      title: 'Встроенный API',
      items: [
        'window.__videoPreview.durationMs',
        'window.__videoPreview.play()',
        'window.__videoPreview.pause()',
        'window.__videoPreview.restart()',
        'window.__videoPreview.seek(ms)',
      ],
    },
    {
      title: 'Пример workflow',
      items: [
        'Изменить сцену и собрать проект.',
        'Переснять still-desktop и contact-sheet.',
        'Снять ранние seek-кадры через pause() + seek(ms) + animations: allow.',
        'Снять mobile shell.',
        'Сгенерировать новый mp4 sample.',
      ],
    },
  ],
  codeSample: `await page.waitForFunction(() => typeof window.__videoPreview?.seek === 'function');\nawait page.evaluate((timeMs) => {\n  window.__videoPreview.pause();\n  window.__videoPreview.seek(timeMs);\n}, ms);\nawait page.waitForTimeout(40);\nawait captureRoot.screenshot({ path: outPath, animations: 'allow' });`,
} as const;
