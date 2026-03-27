import { getFestivalEvents, type FestivalEvent } from './festival';
import { getEventPortraitImage, getEventPortraitStyle } from './media';

export type VideoPreviewSceneKind = 'cold-open' | 'boost' | 'cascade' | 'site' | 'qr';

type VideoPreviewBaseScene = {
  slug: string;
  label: string;
  kind: VideoPreviewSceneKind;
  durationMs: number;
};

export type VideoPreviewColdOpenScene = VideoPreviewBaseScene & {
  kind: 'cold-open';
  lines: string[];
  period: string;
};

export type VideoPreviewBoostScene = VideoPreviewBaseScene & {
  kind: 'boost';
  eyebrow: string;
  shortTitle: string;
  hook: string;
  speakerName: string;
  speakerRole: string;
  portraitImage: string;
  portraitStyle?: string;
  posterImage?: string;
  dateLabel: string;
  venue: string;
  accessLabel: string;
};

export type VideoPreviewCascadeScene = VideoPreviewBaseScene & {
  kind: 'cascade';
  routeLabel: string;
  cards: Array<{
    title: string;
    date: string;
  }>;
};

export type VideoPreviewSiteScene = VideoPreviewBaseScene & {
  kind: 'site';
  domain: string;
  title: string;
  period: string;
  subtitle: string;
};

export type VideoPreviewQrScene = VideoPreviewBaseScene & {
  kind: 'qr';
  platform: 'Telegram' | 'Max';
  title: string;
  subtitle: string;
  secondary: string;
  qrPath: string;
  href: string;
};

export type VideoPreviewScene =
  | VideoPreviewColdOpenScene
  | VideoPreviewBoostScene
  | VideoPreviewCascadeScene
  | VideoPreviewSiteScene
  | VideoPreviewQrScene;

type BoostSceneSeed = {
  slug: string;
  label: string;
  eventMatch: string;
  eyebrow: string;
  shortTitle: string;
  hook: string;
};

const BOOST_SCENE_SEEDS: BoostSceneSeed[] = [
  {
    slug: 'dreams',
    label: 'Boost / О чём мечтали',
    eventMatch: 'О чём мечтали в советском Калининграде',
    eyebrow: 'ЛЕКЦИЯ · БЕСПЛАТНО ПО РЕГИСТРАЦИИ',
    shortTitle: 'О ЧЁМ МЕЧТАЛИ',
    hook: 'КУДА СТРЕМИЛИСЬ И КУДА ПОПАЛИ',
  },
  {
    slug: 'ocean',
    label: 'Boost / Океанологи',
    eventMatch: 'География исследований Мирового океана',
    eyebrow: 'ЛЕКЦИЯ · БЕСПЛАТНО ПО РЕГИСТРАЦИИ',
    shortTitle: 'ОКЕАНОЛОГИ КАЛИНИНГРАДА',
    hook: 'КАК КАЛИНИНГРАД ИЗУЧАЛ МИРОВОЙ ОКЕАН',
  },
  {
    slug: 'bridge',
    label: 'Boost / Мосты времени',
    eventMatch: 'Мост, который соединяет времена',
    eyebrow: 'ЛЕКЦИЯ · БЕСПЛАТНО ПО РЕГИСТРАЦИИ',
    shortTitle: 'МОСТЫ ВРЕМЕНИ',
    hook: 'ПРОШЛОЕ, НАСТОЯЩЕЕ, БУДУЩЕЕ',
  },
  {
    slug: 'future-city',
    label: 'Boost / Калининград 2125',
    eventMatch: 'Калининград 2125',
    eyebrow: 'ЛЕКЦИЯ · БЕСПЛАТНО ПО РЕГИСТРАЦИИ',
    shortTitle: 'КАЛИНИНГРАД 2125',
    hook: 'КАКИМ МОЖЕТ СТАТЬ ГОРОД ЧЕРЕЗ СТО ЛЕТ',
  },
  {
    slug: 'cinema',
    label: 'Boost / Калининград в кино',
    eventMatch: 'Калининград и область как кинодекорация',
    eyebrow: 'ЛЕКЦИЯ · БЕСПЛАТНО ПО РЕГИСТРАЦИИ',
    shortTitle: 'КАЛИНИНГРАД В КИНО',
    hook: 'ГДЕ В РЕГИОНЕ СНИМАЛИ ХУДОЖЕСТВЕННЫЕ ФИЛЬМЫ',
  },
];

function findEvent(events: FestivalEvent[], match: string) {
  const event = events.find((item) => item.title.includes(match));
  if (!event) {
    throw new Error(`Video preview event not found for match: ${match}`);
  }
  return event;
}

function isLecture(formatLabel: string) {
  return formatLabel.toLowerCase().includes('лекц');
}

function createBoostScene(events: FestivalEvent[], seed: BoostSceneSeed): VideoPreviewBoostScene {
  const event = findEvent(events, seed.eventMatch);
  const fallbackPortrait = event.speakerImages[0] ?? '';
  const portraitImage = fallbackPortrait
    ? getEventPortraitImage(event.speakerLabel, fallbackPortrait, isLecture(event.formatLabel))
    : '';

  return {
    slug: seed.slug,
    label: seed.label,
    kind: 'boost',
    durationMs: 4200,
    eyebrow: seed.eyebrow,
    shortTitle: seed.shortTitle,
    hook: seed.hook,
    speakerName: event.speakerLabel,
    speakerRole: event.affiliation,
    portraitImage,
    portraitStyle: getEventPortraitStyle(event.speakerLabel, isLecture(event.formatLabel)),
    posterImage: event.image,
    dateLabel: event.dateLabel,
    venue: event.venue,
    accessLabel: 'ВСЕ МЕРОПРИЯТИЯ БЕСПЛАТНЫЕ',
  };
}

export function getVideoPreviewScenes(): VideoPreviewScene[] {
  const events = getFestivalEvents();

  const cascadeCards = [
    'История становления и развития малых городов',
    'О чём мечтали в советском Калининграде',
    'История Светлогорска в семейном альбоме',
    'Право на существование: зоопарки',
    'Калининград 2125',
    'Калининград и область как кинодекорация',
  ].map((match) => {
    const event = findEvent(events, match);
    return {
      title: event.title,
      date: event.dateLabel,
    };
  });

  return [
    {
      slug: 'cold-open',
      label: 'Cold Open',
      kind: 'cold-open',
      durationMs: 3800,
      lines: ['80', 'ИСТОРИЙ', 'О ГЛАВНОМ', 'НЕ ТОЛЬКО О ПРОШЛОМ'],
      period: '28 МАРТА - 19 ИЮЛЯ 2026',
    },
    ...BOOST_SCENE_SEEDS.map((seed) => createBoostScene(events, seed)),
    {
      slug: 'cascade',
      label: 'Cascade / Названия событий',
      kind: 'cascade',
      durationMs: 4200,
      routeLabel: 'ЧТО ЕЩЁ МОЖНО УСПЕТЬ',
      cards: cascadeCards,
    },
    {
      slug: 'site',
      label: 'Site CTA',
      kind: 'site',
      durationMs: 3600,
      domain: 'KGD80.RU',
      title: '80 ИСТОРИЙ О ГЛАВНОМ',
      period: '28 МАРТА - 19 ИЮЛЯ 2026',
      subtitle: 'РЕГИСТРАЦИЯ НА САЙТЕ',
    },
    {
      slug: 'telegram',
      label: 'QR / Telegram',
      kind: 'qr',
      durationMs: 3200,
      platform: 'Telegram',
      title: 'ПОЛЮБИТЬ КАЛИНИНГРАД АНОНСЫ',
      subtitle: '@kenigevents',
      secondary: 'ОПЕРАТИВНЫЕ АНОНСЫ СОБЫТИЙ',
      qrPath: '/generated/telegram/kenigevents-qr.svg',
      href: 'https://t.me/kenigevents',
    },
    {
      slug: 'max',
      label: 'QR / Max',
      kind: 'qr',
      durationMs: 3200,
      platform: 'Max',
      title: 'ПОЛЮБИТЬ КАЛИНИНГРАД АНОНСЫ',
      subtitle: 'max.ru',
      secondary: 'ОПЕРАТИВНЫЕ АНОНСЫ СОБЫТИЙ',
      qrPath: '/generated/max/max-channel-qr.svg',
      href: 'https://max.ru/join/do_4eLW85-yK_dXcc6f2cmKp9utJuFl_hCo0cxnJ1QA',
    },
  ];
}

export function getVideoPreviewScene(slug: string) {
  return getVideoPreviewScenes().find((scene) => scene.slug === slug);
}
