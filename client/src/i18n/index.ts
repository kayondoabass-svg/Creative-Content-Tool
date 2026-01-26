import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import vi from './locales/vi.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import sw from './locales/sw.json';
import zu from './locales/zu.json';
import zh from './locales/zh.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import lg from './locales/lg.json';

export const languages = [
  { code: 'en', name: 'English', nativeName: 'English', countryCode: 'GB' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', countryCode: 'VN' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', countryCode: 'SA', rtl: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', countryCode: 'IN' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', countryCode: 'KE' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', countryCode: 'ZA' },
  { code: 'zh', name: 'Mandarin', nativeName: '中文', countryCode: 'CN' },
  { code: 'fr', name: 'French', nativeName: 'Français', countryCode: 'FR' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', countryCode: 'ES' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', countryCode: 'BR' },
  { code: 'lg', name: 'Luganda', nativeName: 'Luganda', countryCode: 'UG' },
];

const resources = {
  en: { translation: en },
  vi: { translation: vi },
  ar: { translation: ar },
  hi: { translation: hi },
  sw: { translation: sw },
  zu: { translation: zu },
  zh: { translation: zh },
  fr: { translation: fr },
  es: { translation: es },
  pt: { translation: pt },
  lg: { translation: lg },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'brightboard-language',
    },
  });

const applyRTL = (lang: string) => {
  const isRTL = languages.find(l => l.code === lang)?.rtl;
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
};

applyRTL(i18n.language);

i18n.on('languageChanged', (lang) => {
  applyRTL(lang);
});

export const changeLanguage = (lang: string) => {
  i18n.changeLanguage(lang);
  localStorage.setItem('brightboard-language', lang);
};

export const getCurrentLanguage = () => {
  return i18n.language || 'en';
};

export default i18n;
