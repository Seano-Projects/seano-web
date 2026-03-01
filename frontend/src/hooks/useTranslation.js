import { useLanguage } from '../contexts/LanguageContext'
import en from '../locales/en.json'
import id from '../locales/id.json'

const translations = {
  en,
  id
}

export const useTranslation = () => {
  const { language } = useLanguage()

  const t = key => {
    const keys = key.split('.')
    let value = translations[language]

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k]
      } else {
        return key // Return key if translation not found
      }
    }

    return value || key
  }

  return { t, language }
}

export default useTranslation
