import { getFestivalEventBySlug } from './festival';
import { getEventPortraitImage, getEventPortraitStyle, getSpeakerCaption } from './media';

export type VideoStorySceneKind = 'intro' | 'event' | 'site' | 'qr';

type VideoStorySceneBase = {
  slug: string;
  label: string;
  kind: VideoStorySceneKind;
  durationMs: number;
};

export type VideoStoryIntroScene = VideoStorySceneBase & {
  kind: 'intro';
  titleLines: string[];
  supportLine: string;
  period: string;
  countLabel: string;
  kicker: string;
};

export type VideoStoryEventScene = VideoStorySceneBase & {
  kind: 'event';
  index: number;
  total: number;
  formatLabel: string;
  dateLabel: string;
  timeLabel: string;
  dayNumber: string;
  monthLabel: string;
  weekdayLabel: string;
  titleLines: string[];
  supportLines: string[];
  speakerLine: string;
  speakerRoleLine: string;
  venueLine: string;
  image: string;
  portraitImage?: string;
  portraitStyle?: string;
  photoStyle?: string;
  photoVeilStyle?: string;
  titleStyle?: string;
};

export type VideoStorySiteScene = VideoStorySceneBase & {
  kind: 'site';
  eyebrow: string;
  title: string;
  domain: string;
  subtitle: string;
  footer: string;
};

export type VideoStoryQrScene = VideoStorySceneBase & {
  kind: 'qr';
  platform: 'Telegram' | 'MAX';
  eyebrow: string;
  title: string;
  handle: string;
  subtitle: string;
  footer: string;
  qrPath: string;
  href: string;
};

export type VideoStoryScene = VideoStoryIntroScene | VideoStoryEventScene | VideoStorySiteScene | VideoStoryQrScene;

type EventSceneSeed = {
  slug: string;
  label: string;
  eventSlug: string;
  durationMs: number;
  titleLines: string[];
  supportLines: string[];
  titleStyle?: string;
  portraitImage?: string;
  portraitStyle?: string;
  photoStyle?: string;
  photoVeilStyle?: string;
};

const MONTHS_SHORT: Record<string, string> = {
  января: 'ЯНВ',
  февраля: 'ФЕВ',
  марта: 'МАР',
  апреля: 'АПР',
  мая: 'МАЙ',
  июня: 'ИЮН',
  июля: 'ИЮЛ',
};

const WEEKDAYS_SHORT: Record<string, string> = {
  понедельник: 'ПН',
  вторник: 'ВТ',
  среда: 'СР',
  четверг: 'ЧТ',
  пятница: 'ПТ',
  суббота: 'СБ',
  воскресенье: 'ВС',
};

const EVENT_SCENE_SEEDS: EventSceneSeed[] = [
  {
    slug: 'week-priroda-chemodana',
    label: 'Анонс недели / Природа чемодана',
    eventSlug: 'priroda-chemodana',
    durationMs: 5000,
    titleLines: ['ПРИРОДА', 'ЧЕМОДАНА'],
    supportLines: ['СОВЕТСКОЕ ДЕТСТВО, ВЕЩИ', 'И ПАМЯТЬ О НОВОЙ ЖИЗНИ'],
    portraitStyle:
      '--event-portrait-size:1.16; --event-portrait-width-mobile:60%; --event-portrait-shift-x:-0.18rem; --event-portrait-shift-y:0rem;',
    photoStyle: '--event-photo-position: 52% 50%; --event-photo-scale: 1.04;',
  },
  {
    slug: 'week-zoo-right',
    label: 'Анонс недели / Зоопарки в современном мире',
    eventSlug: 'pravo-na-suschestvovanie-zooparki-v-sovremennom-mire-perspektivy-razvitiya-kaliningradskogo-zooparka',
    durationMs: 5200,
    titleLines: ['ЗООПАРКИ', 'В СОВРЕМЕННОМ', 'МИРЕ'],
    supportLines: ['ПЕРСПЕКТИВЫ РАЗВИТИЯ', 'КАЛИНИНГРАДСКОГО ЗООПАРКА'],
    titleStyle: '--story-event-title-size:5.2rem; --story-event-title-max:8.8ch;',
    portraitStyle:
      '--event-portrait-size:1.24; --event-portrait-width-mobile:58%; --event-portrait-shift-x:-0.1rem; --event-portrait-shift-y:0rem;',
    photoStyle: '--event-photo-position: 86% 64%; --event-photo-scale: 1.01;',
  },
  {
    slug: 'week-nostalgia',
    label: 'Анонс недели / Ностальгический разговор',
    eventSlug: 'nostalgicheskiy-razgovor',
    durationMs: 5000,
    titleLines: ['НОСТАЛЬГИЧЕСКИЙ', 'РАЗГОВОР'],
    supportLines: ['КАК ГОВОРИТЬ О ПРОШЛОМ', 'БЕЗ ШТАМПОВ И МЕЛОДРАМЫ'],
    titleStyle: '--story-event-title-size:4.98rem; --story-event-title-max:10.8ch;',
    portraitStyle:
      '--event-portrait-size:1.18; --event-portrait-width-mobile:56%; --event-portrait-shift-x:-0.08rem; --event-portrait-shift-y:0rem;',
    photoStyle: '--event-photo-position: 42% 48%; --event-photo-scale: 1.04;',
  },
  {
    slug: 'week-bridge',
    label: 'Анонс недели / Мост, который соединяет времена',
    eventSlug: 'most-kotoryy-soedinyaet-vremena-dvuhyarusnyy-most-proshloe-nastoyaschee-i-buduschee',
    durationMs: 5200,
    titleLines: ['МОСТ, КОТОРЫЙ', 'СОЕДИНЯЕТ', 'ВРЕМЕНА'],
    supportLines: ['ДВУХЪЯРУСНЫЙ МОСТ:', 'ПРОШЛОЕ, НАСТОЯЩЕЕ, БУДУЩЕЕ'],
    titleStyle: '--story-event-title-size:5rem; --story-event-title-max:10.5ch;',
    portraitImage: '/generated/speaker-strip/mosienko-evgeniy.webp',
    portraitStyle:
      '--event-portrait-size:1.22; --event-portrait-width-mobile:62%; --event-portrait-shift-x:-0.12rem; --event-portrait-shift-y:0rem;',
    photoStyle: '--event-photo-position: 50% 40%; --event-photo-scale: 1.0;',
    photoVeilStyle: '--event-photo-veil-left: 0.22; --event-photo-veil-mid: 0.12; --event-photo-veil-bottom: 0.5;',
  },
];

function getShortSpeakerName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]} ${parts.at(-1) ?? ''}`.trim();
  }
  return value.trim();
}

function parseStoryDate(dateLabel: string) {
  const match = dateLabel.match(/(\d{1,2})\s+([а-я]+)\s+2026\s+\(([^)]+)\)/i);
  if (!match) {
    return {
      dayNumber: '',
      monthLabel: '',
      weekdayLabel: '',
    };
  }

  return {
    dayNumber: match[1].padStart(2, '0'),
    monthLabel: MONTHS_SHORT[match[2].toLowerCase()] ?? match[2].slice(0, 3).toUpperCase(),
    weekdayLabel: WEEKDAYS_SHORT[match[3].toLowerCase()] ?? match[3].slice(0, 2).toUpperCase(),
  };
}

function createEventScene(seed: EventSceneSeed, index: number, total: number): VideoStoryEventScene {
  const event = getFestivalEventBySlug(seed.eventSlug, { includeHidden: true });

  if (!event) {
    throw new Error(`Unknown story event: ${seed.eventSlug}`);
  }

  const fallbackPortrait = event.speakerImages[0] ?? '';
  const portraitImage = seed.portraitImage ?? (fallbackPortrait
    ? getEventPortraitImage(event.speakerLabel, fallbackPortrait, event.formatLabel.toLowerCase().includes('лекц'))
    : undefined);
  const portraitStyle = [
    getEventPortraitStyle(
      event.speakerLabel,
      event.formatLabel.toLowerCase().includes('лекц'),
    ),
    seed.portraitStyle,
  ]
    .filter(Boolean)
    .join(' ') || undefined;
  const dateParts = parseStoryDate(event.dateLabel);

  return {
    slug: seed.slug,
    label: seed.label,
    kind: 'event',
    durationMs: seed.durationMs,
    index,
    total,
    formatLabel: event.formatLabel.toUpperCase(),
    dateLabel: event.dateLabel,
    timeLabel: event.timeLabel,
    dayNumber: dateParts.dayNumber,
    monthLabel: dateParts.monthLabel,
    weekdayLabel: dateParts.weekdayLabel,
    titleLines: seed.titleLines,
    supportLines: seed.supportLines,
    speakerLine: getShortSpeakerName(event.speakerLabel),
    speakerRoleLine: getSpeakerCaption(event.heroRole || event.affiliation),
    venueLine: event.venue,
    image: event.image ?? '',
    portraitImage,
    portraitStyle,
    photoStyle: seed.photoStyle,
    photoVeilStyle: seed.photoVeilStyle,
    titleStyle: seed.titleStyle,
  };
}

export const VIDEO_STORY_SCENE_SLUGS = [
  'week-intro',
  ...EVENT_SCENE_SEEDS.map((scene) => scene.slug),
  'week-site',
  'week-telegram',
  'week-max',
] as const;

export function getVideoStoryScenes(): VideoStoryScene[] {
  const eventScenes = EVENT_SCENE_SEEDS.map((seed, index) =>
    createEventScene(seed, index + 1, EVENT_SCENE_SEEDS.length),
  );

  return [
    {
      slug: 'week-intro',
      label: 'Анонс недели / Интро',
      kind: 'intro',
      durationMs: 2600,
      titleLines: ['АНОНС', 'НЕДЕЛИ'],
      supportLine: 'ФЕСТИВАЛЬ «80 ИСТОРИЙ О ГЛАВНОМ»',
      period: '6–12 АПРЕЛЯ 2026',
      countLabel: '4 СОБЫТИЯ · KGD80.RU',
      kicker: 'ГЛАВНЫЕ СОБЫТИЯ И РЕГИСТРАЦИЯ',
    },
    ...eventScenes,
    {
      slug: 'week-site',
      label: 'Анонс недели / Сайт',
      kind: 'site',
      durationMs: 2800,
      eyebrow: 'ПОЛНАЯ ПРОГРАММА И РЕГИСТРАЦИЯ',
      title: 'РЕГИСТРАЦИЯ НА СОБЫТИЯ',
      domain: 'KGD80.RU',
      subtitle: 'СВОБОДНЫЕ МЕСТА, ДАТЫ, ЛОКАЦИИ И ВСЯ ПРОГРАММА НЕДЕЛИ',
      footer: 'ПОТОМ TELEGRAM И MAX ДЛЯ СРОЧНЫХ ОБНОВЛЕНИЙ',
    },
    {
      slug: 'week-telegram',
      label: 'Анонс недели / Telegram QR',
      kind: 'qr',
      durationMs: 3400,
      platform: 'Telegram',
      eyebrow: 'ОПЕРАТИВНАЯ ИНФОРМАЦИЯ ПО ФЕСТИВАЛЮ',
      title: 'ПОДПИШИТЕСЬ',
      handle: '@KENIGEVENTS',
      subtitle: 'СКАНИРУЙТЕ QR И ЛОВИТЕ НОВЫЕ АНОНСЫ',
      footer: 'БАЗА АНОНСОВ СОБЫТИЙ КАЛИНИНГРАДСКОЙ ОБЛАСТИ',
      qrPath: '/generated/telegram/kenigevents-qr-stat.svg',
      href: 'https://t.me/+Jhg7TZBUTNc3ZmMy',
    },
    {
      slug: 'week-max',
      label: 'Анонс недели / MAX QR',
      kind: 'qr',
      durationMs: 3400,
      platform: 'MAX',
      eyebrow: 'ОПЕРАТИВНАЯ ИНФОРМАЦИЯ ПО ФЕСТИВАЛЮ',
      title: 'ПОДПИШИТЕСЬ',
      handle: 'MAX.RU',
      subtitle: 'ТАМ ЖЕ ПРИХОДЯТ ДОПМЕСТА И СРОЧНЫЕ ОБНОВЛЕНИЯ',
      footer: 'БАЗА АНОНСОВ СОБЫТИЙ КАЛИНИНГРАДСКОЙ ОБЛАСТИ',
      qrPath: '/generated/max/max-channel-qr.svg',
      href: 'https://max.ru/join/do_4eLW85-yK_dXcc6f2cmKp9utJuFl_hCo0cxnJ1QA',
    },
  ];
}

export function getVideoStoryScene(slug: string) {
  return getVideoStoryScenes().find((scene) => scene.slug === slug);
}
