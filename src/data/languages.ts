export type LanguageCode =
  | 'kjv' | 'twi' | 'yor' | 'swa' | 'rv1960' | 'jfa' | 'lsg'
  | 'zul' | 'svd'
  | 'it' | 'de' | 'ja'
  | 'chi' | 'hin' | 'rus'
  | 'nld' | 'kor';

export interface LanguageInfo {
  code: LanguageCode;
  nativeName: string;
  label: string;
  rtl?: boolean;
  offline?: boolean;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'kjv',    nativeName: 'English',   label: 'KJV',     offline: true },
  { code: 'twi',    nativeName: 'Twi',       label: 'Akuapem', offline: true },
  { code: 'yor',    nativeName: 'Yorùbá',    label: 'Bibeli' },
  { code: 'swa',    nativeName: 'Kiswahili', label: 'Union' },
  { code: 'rv1960', nativeName: 'Español',   label: 'RV1960' },
  { code: 'jfa',    nativeName: 'Português', label: 'Almeida' },
  { code: 'lsg',    nativeName: 'Français',  label: 'Segond' },
  { code: 'it',     nativeName: 'Italiano',  label: 'Riveduta' },
  { code: 'de',     nativeName: 'Deutsch',   label: 'Luther' },
  { code: 'ja',     nativeName: '日本語',    label: '口語訳' },
  { code: 'chi',    nativeName: '中文',      label: 'CUV' },
  { code: 'hin',    nativeName: 'हिन्दी',     label: 'Hindi' },
  { code: 'rus',    nativeName: 'Русский',   label: 'Synodal' },
  { code: 'zul',    nativeName: 'isiZulu',   label: 'Zulu' },
  { code: 'svd',    nativeName: 'العربية',   label: 'Arabic' },
  { code: 'nld',    nativeName: 'Nederlands', label: 'Statenvertaling', offline: true },
  { code: 'kor',    nativeName: '한국어',     label: '개역한글',       offline: true },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'kjv';

export const languageNames: Record<LanguageCode, string> = {
  nld: 'Nederlands (Statenvertaling)',
  kor: '한국어 (개역한글)',
  kjv: 'English (KJV)',
  twi: 'Twi (Akuapem)',
  yor: 'Yorùbá',
  swa: 'Kiswahili',
  rv1960: 'Español (RV1960)',
  jfa: 'Português (Almeida)',
  lsg: 'Français (Segond)',
  it: 'Italiano (Riveduta)',
  de: 'Deutsch (Luther)',
  ja: '日本語 (口語訳)',
  chi: '中文 (CUV)',
  hin: 'हिन्दी',
  rus: 'Русский (Synodal)',
  zul: 'isiZulu',
  svd: 'العربية (SVD)',
};