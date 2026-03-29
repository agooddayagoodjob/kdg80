const EVENT_PORTRAIT_OVERRIDES: Array<{ match: string; style: string }> = [
  { match: 'Мосиенко', style: '--event-portrait-size: 1.24; --event-portrait-shift-x: 0.22rem; --event-portrait-shift-y: 0rem;' },
  { match: 'Соколов', style: '--event-portrait-size: 1; --event-portrait-shift-x: 0.08rem; --event-portrait-shift-y: 0rem;' },
  { match: 'Конюхова', style: '--event-portrait-size: 1.04; --event-portrait-shift-x: 0.08rem; --event-portrait-shift-y: 0rem;' },
  { match: 'Илюшкина', style: '--event-portrait-size: 1.03; --event-portrait-shift-x: 0.28rem; --event-portrait-shift-y: 0.14rem;' },
  { match: 'Долотова', style: '--event-portrait-size: 1.02; --event-portrait-shift-x: 0.1rem; --event-portrait-shift-y: 0.12rem;' },
  { match: 'Надымова', style: '--event-portrait-size: 1.04; --event-portrait-shift-x: 0.12rem; --event-portrait-shift-y: 0.12rem;' },
  { match: 'Ярцев', style: '--event-portrait-size: 1; --event-portrait-shift-x: 0.08rem; --event-portrait-shift-y: 0.16rem;' },
];

const LECTURE_EVENT_PORTRAIT_OVERRIDES: Array<{ match: string; style: string }> = [
  {
    match: 'Мосиенко',
    style: '--event-portrait-size: 1.04; --event-portrait-shift-x: 0.18rem; --event-portrait-shift-y: 0.08rem; --event-portrait-width-mobile: min(40.5%, 13rem); --event-portrait-width-desktop: min(39%, 13.2rem);',
  },
  {
    match: 'Конюхова',
    style: '--event-portrait-size: 0.9; --event-portrait-shift-x: 0.08rem; --event-portrait-shift-y: 0.04rem; --event-portrait-width-mobile: min(37%, 12.1rem); --event-portrait-width-desktop: min(36%, 12.35rem);',
  },
  {
    match: 'Сарниц',
    style: '--event-portrait-size: 1.08; --event-portrait-shift-x: -1.45rem; --event-portrait-shift-y: 0rem; --event-portrait-width-mobile: min(43%, 13.2rem); --event-portrait-width-desktop: min(40.5%, 13.6rem);',
  },
];

const LECTURE_PORTRAIT_IMAGE_OVERRIDES: Array<{ match: string; path: string }> = [
  { match: 'Мосиенко', path: '/generated/lecture-portraits/mosienko-evgeniy-lecture.webp' },
  { match: 'Конюхова', path: '/generated/lecture-portraits/tatyana-konyuhova-lecture.webp' },
  { match: 'Сарниц', path: '/generated/lecture-portraits/sarnits-artur-lecture.webp' },
];

const SPEAKER_STRIP_IMAGE_OVERRIDES: Array<{ match: string; path: string }> = [
  { match: 'Соколова', path: '/generated/speaker-strip/sokolova-svetlana.webp' },
  { match: 'Соколов', path: '/generated/speaker-strip/aleksey-sokolov.webp' },
  { match: 'Долотова', path: '/generated/speaker-strip/dolotova-inga.webp' },
  { match: 'Жадобко', path: '/generated/speaker-strip/zhadobko-sergey.webp' },
  { match: 'Илюшкина', path: '/generated/speaker-strip/ilyushkina-ekaterina.webp' },
  { match: 'Машинская', path: '/generated/speaker-strip/mashinskaya-ekaterina.webp' },
  { match: 'Мосиенко', path: '/generated/speaker-strip/mosienko-evgeniy.webp' },
  { match: 'Надымова', path: '/generated/speaker-strip/nadymova-valeriya.webp' },
  { match: 'Нижегородцева', path: '/generated/speaker-strip/nizhegorodtseva-evgeniya.webp' },
  { match: 'Попадин', path: '/generated/speaker-strip/popadin-aleksandr.webp' },
  { match: 'Скребцова', path: '/generated/speaker-strip/skrebtsova-anastasiya.webp' },
  { match: 'Конюхова', path: '/generated/speaker-strip/tatyana-konyuhova.webp' },
  { match: 'Удовенко', path: '/generated/speaker-strip/udovenko-tatyana.webp' },
];

const SPEAKER_STRIP_STYLE_OVERRIDES: Array<{ match: string; style: string }> = [
  { match: 'Конюхова', style: '--speaker-strip-scale-mobile: 0.386; --speaker-strip-scale-desktop: 0.486; --speaker-strip-x-mobile: -4px; --speaker-strip-x-desktop: -10px; --speaker-strip-y-mobile: -6px; --speaker-strip-y-desktop: -12px;' },
  { match: 'Жадобко', style: '--speaker-strip-scale-mobile: 0.314; --speaker-strip-scale-desktop: 0.383; --speaker-strip-y-mobile: 8px; --speaker-strip-y-desktop: 16px;' },
  { match: 'Марковец', style: '--speaker-strip-scale-mobile: 0.368; --speaker-strip-scale-desktop: 0.454; --speaker-strip-y-mobile: 2px; --speaker-strip-y-desktop: 8px;' },
  { match: 'Надымова', style: '--speaker-strip-scale-mobile: 0.298; --speaker-strip-scale-desktop: 0.346; --speaker-strip-x-mobile: -18px; --speaker-strip-x-desktop: -26px; --speaker-strip-y-mobile: 14px; --speaker-strip-y-desktop: 18px;' },
  { match: 'Сарниц', style: '--speaker-strip-scale-mobile: 0.256; --speaker-strip-scale-desktop: 0.314; --speaker-strip-x-mobile: 56px; --speaker-strip-x-desktop: 82px; --speaker-strip-y-mobile: 16px; --speaker-strip-y-desktop: 24px;' },
  { match: 'Селин', style: '--speaker-strip-scale-mobile: 0.274; --speaker-strip-scale-desktop: 0.334; --speaker-strip-x-mobile: -8px; --speaker-strip-x-desktop: -12px; --speaker-strip-y-mobile: 10px; --speaker-strip-y-desktop: 14px;' },
  { match: 'Сивкова', style: '--speaker-strip-scale-mobile: 0.286; --speaker-strip-scale-desktop: 0.344; --speaker-strip-x-mobile: -10px; --speaker-strip-x-desktop: -16px; --speaker-strip-y-mobile: 10px; --speaker-strip-y-desktop: 14px;' },
  { match: 'Удовенко', style: '--speaker-strip-scale-mobile: 0.324; --speaker-strip-scale-desktop: 0.398; --speaker-strip-x-mobile: -12px; --speaker-strip-x-desktop: -18px; --speaker-strip-y-mobile: 14px; --speaker-strip-y-desktop: 20px;' },
  { match: 'Ситникова', style: '--speaker-strip-scale-mobile: 0.332; --speaker-strip-scale-desktop: 0.41; --speaker-strip-y-mobile: 14px; --speaker-strip-y-desktop: 20px;' },
];

const DIALOGUE_PORTRAIT_STYLE_OVERRIDES: Array<{ match: string; style: string }> = [
  { match: 'Удовенко', style: '--dialogue-portrait-scale-mobile: 0.236; --dialogue-portrait-scale-desktop: 0.226; --dialogue-portrait-x-mobile: 3px; --dialogue-portrait-x-desktop: 6px;' },
  { match: 'Сивкова', style: '--dialogue-portrait-scale-mobile: 0.222; --dialogue-portrait-scale-desktop: 0.212;' },
  { match: 'Жадобко', style: '--dialogue-portrait-scale-mobile: 0.217; --dialogue-portrait-scale-desktop: 0.208;' },
  { match: 'Попадин', style: '--dialogue-portrait-scale-mobile: 0.214; --dialogue-portrait-scale-desktop: 0.206;' },
  { match: 'Литвинович', style: '--dialogue-portrait-scale-mobile: 0.219; --dialogue-portrait-scale-desktop: 0.208; --dialogue-portrait-x-mobile: -3px; --dialogue-portrait-x-desktop: -6px;' },
  { match: 'Бойко', style: '--dialogue-portrait-scale-mobile: 0.219; --dialogue-portrait-scale-desktop: 0.208;' },
  { match: 'Марковец', style: '--dialogue-portrait-scale-mobile: 0.221; --dialogue-portrait-scale-desktop: 0.212;' },
  { match: 'Никитин', style: '--dialogue-portrait-scale-mobile: 0.221; --dialogue-portrait-scale-desktop: 0.21;' },
  { match: 'Сарниц', style: '--dialogue-portrait-x-desktop: 22px;' },
  { match: 'Долотова', style: '--dialogue-portrait-scale-mobile: 0.218; --dialogue-portrait-scale-desktop: 0.208;' },
  { match: 'Ярцев', style: '--dialogue-portrait-scale-mobile: 0.216; --dialogue-portrait-scale-desktop: 0.206;' },
];

export function getSpeakerCaption(value: string) {
  if (!value) {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
}

export function getSpeakerStripImage(name: string, fallback: string) {
  return SPEAKER_STRIP_IMAGE_OVERRIDES.find((entry) => name.includes(entry.match))?.path
    ?? fallback.replace('/generated/speakers/', '/generated/speaker-strip/');
}

export function getEventPortraitImage(name: string, fallback: string, isLecture = false) {
  if (isLecture) {
    const lectureOverride = LECTURE_PORTRAIT_IMAGE_OVERRIDES.find((entry) => name.includes(entry.match))?.path;
    if (lectureOverride) {
      return lectureOverride;
    }
  }

  return getSpeakerStripImage(name, fallback);
}

export function getEventPortraitImages(name: string, images: string[], isLecture = false) {
  return images.map((image) => getEventPortraitImage(name, image, isLecture));
}

export function getPortraitFrames(name: string, images: string[], isLecture = false) {
  return getEventPortraitImages(name, images, isLecture).join('|');
}

export function getSpeakerStripStyle(name: string) {
  return SPEAKER_STRIP_STYLE_OVERRIDES.find((entry) => name.includes(entry.match))?.style;
}

export type SpeakerStripCard = {
  name: string;
  affiliation: string;
  anchor: string;
  image: string;
  style?: string;
};

export function toSpeakerStripCard(entry: Pick<SpeakerShowcaseEntry, 'name' | 'affiliation' | 'images' | 'anchor'>): SpeakerStripCard {
  const fallbackImage = entry.images[0] ?? '';

  return {
    name: entry.name,
    affiliation: getSpeakerCaption(entry.affiliation),
    anchor: entry.anchor,
    image: getSpeakerStripImage(entry.name, fallbackImage),
    style: getSpeakerStripStyle(entry.name),
  };
}

export function getDialoguePortraitImage(name: string, fallback: string) {
  return getSpeakerStripImage(name, fallback);
}

export function getDialoguePortraitStyle(name: string) {
  return DIALOGUE_PORTRAIT_STYLE_OVERRIDES.find((entry) => name.includes(entry.match))?.style ?? undefined;
}

export function getEventPortraitStyle(value: string, isLecture = false) {
  if (isLecture) {
    const lectureStyle = LECTURE_EVENT_PORTRAIT_OVERRIDES.find((entry) => value.includes(entry.match))?.style;
    if (lectureStyle) {
      return lectureStyle;
    }
  }

  return EVENT_PORTRAIT_OVERRIDES.find((entry) => value.includes(entry.match))?.style ?? undefined;
}
import type { SpeakerShowcaseEntry } from './festival';
