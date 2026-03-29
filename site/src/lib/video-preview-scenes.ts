import { getFestivalEvents, type FestivalEvent } from './festival';
import { getEventPortraitImage, getEventPortraitStyle } from './media';
import registrationManifest from '../data/registration-state-manifest.json';

export type VideoPreviewSceneKind = 'cold-open' | 'boost' | 'cascade' | 'site' | 'qr' | 'sequence';

type VideoPreviewBaseScene = {
  slug: string;
  label: string;
  kind: VideoPreviewSceneKind;
  durationMs: number;
};

export type VideoPreviewColdOpenScene = VideoPreviewBaseScene & {
  kind: 'cold-open';
  tagline: string[];
  supportLine: string;
  period: string;
};

export type VideoPreviewBoostScene = VideoPreviewBaseScene & {
  kind: 'boost';
  eyebrow: string;
  shortTitle: string;
  hook: string;
  mythLabel?: string;
  mythText?: string;
  detailLabel: string;
  detailLines: string[];
  detailAttribution?: string;
  speakerName: string;
  speakerRole: string;
  portraitImage: string;
  portraitStyle?: string;
  posterImage?: string;
  dateLabel: string;
  venue: string;
  accessLabel?: string;
  availabilityLabel?: string;
  availabilityTone?: 'available' | 'low' | 'soon';
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

export type VideoPreviewSequenceScene = VideoPreviewBaseScene & {
  kind: 'sequence';
  title: string;
};

export type VideoPreviewScene =
  | VideoPreviewColdOpenScene
  | VideoPreviewBoostScene
  | VideoPreviewCascadeScene
  | VideoPreviewSiteScene
  | VideoPreviewQrScene
  | VideoPreviewSequenceScene;

type BoostSceneSeed = {
  slug: string;
  label: string;
  eventMatch: string;
  eyebrow: string;
  shortTitle: string;
  hook: string;
  mythText?: string;
  detailLabel: string;
  detailLines: string[];
  detailAttribution?: string;
  durationMs?: number;
  portraitStyle?: string;
};

type RegistrationManifestItem = {
  slug: string;
  capacity?: number;
  overbookingPercent?: number;
  registrationLimit?: number;
  registrationLimitPercent?: number;
  seatsTaken?: number;
  seatsLeft?: number;
  publicState?: string;
  registrationPublicState?: string;
  ctaLabel?: string;
};

type RegistrationManifest = {
  generatedAt?: string | null;
  items?: RegistrationManifestItem[];
};

const registrationStateBySlug = new Map(
  ((registrationManifest as RegistrationManifest).items ?? []).map((item) => [item.slug, item] as const),
);

const BOOST_SCENE_SEEDS: BoostSceneSeed[] = [
  {
    slug: 'dreams',
    label: 'Boost / О чём мечтали',
    eventMatch: 'О чём мечтали в советском Калининграде',
    eyebrow: 'ЛЕКЦИЯ · БЕСПЛАТНО ПО РЕГИСТРАЦИИ',
    shortTitle: 'О ЧЁМ МЕЧТАЛИ',
    hook: 'КУДА СТРЕМИЛИСЬ И КУДА ПОПАЛИ',
    mythText: 'В СОВЕТСКОМ КАЛИНИНГРАДЕ ЖИЗНЬ БЫЛА СКУЧНОЙ',
    detailLabel: 'ПОСЛЕ ЛЕКЦИИ',
    detailLines: [
      'ПОЧЕМУ КАЛИНИНГРАД СТАЛ ГОРОДОМ СУМАСШЕДШИХ ВОЗМОЖНОСТЕЙ?',
    ],
    durationMs: 9200,
  },
  {
    slug: 'ocean',
    label: 'Boost / Океанологи',
    eventMatch: 'География исследований Мирового океана',
    eyebrow: 'ЛЕКЦИЯ · БЕСПЛАТНО ПО РЕГИСТРАЦИИ',
    shortTitle: 'ОКЕАНОЛОГИ КАЛИНИНГРАДА',
    hook: 'КАК КАЛИНИНГРАД ИЗУЧАЛ МИРОВОЙ ОКЕАН',
    mythText: 'КАЛИНИНГРАДСКИЕ УЧЁНЫЕ ИЗУЧАЛИ ОКЕАН ТОЛЬКО РАДИ РЫБЫ',
    detailLabel: 'ЦИТАТА',
    detailLines: [
      'ОКЕАН - ЭТО ХРАНИТЕЛЬ ИСТОРИИ, ДЫХАНИЕ ТЕКУЩЕГО МОМЕНТА,',
      'ВЕЧНЫЙ ЗОВ И НАДЕЖДА БУДУЩЕГО ЧЕЛОВЕЧЕСТВА.',
    ],
    detailAttribution: 'Владимир Андреевич Чечко',
    durationMs: 8600,
  },
  {
    slug: 'bridge',
    label: 'Boost / Мосты времени',
    eventMatch: 'Мост, который соединяет времена',
    eyebrow: 'ЛЕКЦИЯ · БЕСПЛАТНО ПО РЕГИСТРАЦИИ',
    shortTitle: 'МОСТЫ ВРЕМЕНИ',
    hook: 'ПРОШЛОЕ, НАСТОЯЩЕЕ, БУДУЩЕЕ',
    mythText: 'ДВУХЪЯРУСНЫЙ МОСТ СПРОЕКТИРОВАЛ ЭЙФЕЛЬ',
    detailLabel: 'ПОСЛЕ ЛЕКЦИИ',
    detailLines: [
      'ПОЧЕМУ МОСТ ПОСТРОЕН В ДВА ЯРУСА?',
      'ЧТО В НЁМ НЕМЕЦКОЕ, А ЧТО ДОСТРОИЛИ СОВЕТСКИЕ ИНЖЕНЕРЫ?',
    ],
    durationMs: 9000,
    portraitStyle: '--event-portrait-size: 1.46; --event-portrait-shift-x: -0.18rem; --event-portrait-shift-y: 0.18rem; --event-portrait-width: min(45%, 37rem);',
  },
  {
    slug: 'future-city',
    label: 'Boost / Калининград 2125',
    eventMatch: 'Калининград 2125',
    eyebrow: 'ЛЕКЦИЯ · БЕСПЛАТНО ПО РЕГИСТРАЦИИ',
    shortTitle: 'КАЛИНИНГРАД 2125',
    hook: 'КАКИМ МОЖЕТ СТАТЬ ГОРОД ЧЕРЕЗ СТО ЛЕТ',
    mythText: 'КАЛИНИНГРАД - ПЕРИФЕРИЙНЫЙ ГОРОД БЕЗ БОЛЬШОГО БУДУЩЕГО',
    detailLabel: 'ЦИТАТА',
    detailLines: [
      'ЧЕРЕЗ СТО ЛЕТ ГОРОД БУДЕТ ТАКИМ,',
      'КАКИМ МЫ РЕШИМ СДЕЛАТЬ ЕГО СЕГОДНЯ.',
    ],
    detailAttribution: 'Артур Артурович Сарниц',
    portraitStyle: '--event-portrait-size: 1.82; --event-portrait-shift-x: -3.05rem; --event-portrait-shift-y: 0.14rem; --event-portrait-width: min(48.5%, 39.5rem);',
    durationMs: 9000,
  },
  {
    slug: 'cinema',
    label: 'Boost / Калининград в кино',
    eventMatch: 'Калининград и область как кинодекорация',
    eyebrow: 'ЛЕКЦИЯ · БЕСПЛАТНО ПО РЕГИСТРАЦИИ',
    shortTitle: 'КАЛИНИНГРАД В КИНО',
    hook: 'ГДЕ В РЕГИОНЕ СНИМАЛИ ХУДОЖЕСТВЕННЫЕ ФИЛЬМЫ',
    mythText: 'В КАЛИНИНГРАДЕ СНИМАЛИ ТОЛЬКО ВОЕННЫЕ ФИЛЬМЫ',
    detailLabel: 'ЛЕКЦИЯ ОТВЕЧАЕТ',
    detailLines: [
      'ПОЧЕМУ РЕЖИССЁРЫ ДЕСЯТИЛЕТИЯМИ ВОЗВРАЩАЛИСЬ ИМЕННО СЮДА?',
      'КАК КИНО ПОКАЗЫВАЕТ ИСЧЕЗНУВШИЙ КАЛИНИНГРАД?',
    ],
    durationMs: 8600,
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

function resolveAvailabilityState(event: FestivalEvent) {
  const registrationState = registrationStateBySlug.get(event.slug);

  if (registrationState?.publicState === 'registration_soon' || event.publicRegistrationStateOverride === 'registration_soon') {
    return {
      label: 'РЕГИСТРАЦИЯ СКОРО',
      tone: 'soon' as const,
    };
  }

  if (registrationState?.publicState !== 'registration_open') {
    return undefined;
  }

  const capacity = registrationState.registrationLimit ?? registrationState.capacity ?? 0;
  const seatsLeft = registrationState.seatsLeft ?? 0;
  const ratio = capacity > 0 ? seatsLeft / capacity : 1;

  if (ratio < 0.1) {
    return {
      label: 'МАЛО МЕСТ',
      tone: 'low' as const,
    };
  }

  return {
    label: 'ЕСТЬ МЕСТА',
    tone: 'available' as const,
  };
}

function createBoostScene(events: FestivalEvent[], seed: BoostSceneSeed): VideoPreviewBoostScene {
  const event = findEvent(events, seed.eventMatch);
  const fallbackPortrait = event.speakerImages[0] ?? '';
  const portraitImage = fallbackPortrait
    ? getEventPortraitImage(event.speakerLabel, fallbackPortrait, isLecture(event.formatLabel))
    : '';
  const availabilityState = resolveAvailabilityState(event);

  return {
    slug: seed.slug,
    label: seed.label,
    kind: 'boost',
    durationMs: seed.durationMs ?? 5600,
    eyebrow: seed.eyebrow,
    shortTitle: seed.shortTitle,
    hook: seed.hook,
    mythLabel: seed.mythText ? 'ПРАВДА ЛИ, ЧТО' : undefined,
    mythText: seed.mythText,
    detailLabel: seed.detailLabel,
    detailLines: seed.detailLines,
    detailAttribution: seed.detailAttribution,
    speakerName: event.speakerLabel,
    speakerRole: event.affiliation,
    portraitImage,
    portraitStyle: [
      getEventPortraitStyle(event.speakerLabel, isLecture(event.formatLabel)),
      seed.portraitStyle,
    ]
      .filter(Boolean)
      .join(' '),
    posterImage: event.image,
    dateLabel: event.dateLabel,
    venue: event.venue,
    accessLabel: 'БЕСПЛАТНО ПО РЕГИСТРАЦИИ',
    availabilityLabel: availabilityState?.label,
    availabilityTone: availabilityState?.tone,
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
      tagline: ['НЕ ТОЛЬКО', 'О ПРОШЛОМ'],
      supportLine: '43 СПИКЕРА · 50+ СОБЫТИЙ · БЕСПЛАТНО',
      period: '28 МАРТА - 19 ИЮЛЯ 2026',
    },
    ...BOOST_SCENE_SEEDS.map((seed) => createBoostScene(events, seed)),
    {
      slug: 'cascade',
      label: 'Cascade / Названия событий',
      kind: 'cascade',
      durationMs: 5600,
      routeLabel: 'ЧТО ЕЩЁ МОЖНО УСПЕТЬ',
      cards: cascadeCards,
    },
    {
      slug: 'festival-flow',
      label: 'Sequence / Общий ролик',
      kind: 'sequence',
      durationMs: 16000,
      title: 'ОБЩИЙ РОЛИК',
    },
    {
      slug: 'site',
      label: 'Site CTA',
      kind: 'site',
      durationMs: 4400,
      domain: 'KGD80.RU',
      title: '80 ИСТОРИЙ О ГЛАВНОМ',
      period: '28 МАРТА - 19 ИЮЛЯ 2026',
      subtitle: 'РЕГИСТРАЦИЯ НА САЙТЕ',
    },
    {
      slug: 'telegram',
      label: 'QR / Telegram',
      kind: 'qr',
      durationMs: 6400,
      platform: 'Telegram',
      title: 'ПОЛЮБИТЬ КАЛИНИНГРАД АНОНСЫ',
      subtitle: '@kenigevents',
      secondary: 'ОПЕРАТИВНЫЕ АНОНСЫ ПО ФЕСТИВАЛЮ',
      qrPath: '/generated/telegram/kenigevents-qr.svg',
      href: 'https://t.me/+Jhg7TZBUTNc3ZmMy',
    },
    {
      slug: 'max',
      label: 'QR / Max',
      kind: 'qr',
      durationMs: 6400,
      platform: 'Max',
      title: 'ПОЛЮБИТЬ КАЛИНИНГРАД АНОНСЫ',
      subtitle: 'max.ru',
      secondary: 'ОПЕРАТИВНЫЕ АНОНСЫ ПО ФЕСТИВАЛЮ',
      qrPath: '/generated/max/max-channel-qr.svg',
      href: 'https://max.ru/join/do_4eLW85-yK_dXcc6f2cmKp9utJuFl_hCo0cxnJ1QA',
    },
  ];
}

export function getVideoPreviewScene(slug: string) {
  return getVideoPreviewScenes().find((scene) => scene.slug === slug);
}
