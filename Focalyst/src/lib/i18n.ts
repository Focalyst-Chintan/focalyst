import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';
import ja from '../locales/ja.json';
import ko from '../locales/ko.json';
import zhCN from '../locales/zh-CN.json';
import hi from '../locales/hi.json';

const LANGUAGE_KEY = 'focalyst_language';

// Initialize i18n synchronously with English default,
// then asynchronously load the saved language preference
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      ja: { translation: ja },
      ko: { translation: ko },
      'zh-CN': { translation: zhCN },
      hi: { translation: hi },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// Load saved language from AsyncStorage on startup
AsyncStorage.getItem(LANGUAGE_KEY).then((savedLang) => {
  if (savedLang && savedLang !== i18n.language) {
    i18n.changeLanguage(savedLang);
  }
});

/**
 * Change the app language and persist the choice to AsyncStorage.
 */
export async function changeLanguage(lang: string) {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
}

export default i18n;
