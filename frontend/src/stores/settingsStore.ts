import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Language = 'mn' | 'en'
type Theme = 'dark' | 'light'

interface SettingsState {
  language: Language
  theme: Theme
  setLanguage: (lang: Language) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: 'mn',
      theme: 'dark',

      setLanguage: (language) => set({ language }),

      setTheme: (theme) => {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('light', 'dark')
          document.documentElement.classList.add(theme)
        }
        set({ theme })
      },

      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark'
        get().setTheme(newTheme)
      },
    }),
    {
      name: 'gerege-settings',
      onRehydrateStorage: () => (state) => {
        if (state && typeof document !== 'undefined') {
          document.documentElement.classList.remove('light', 'dark')
          document.documentElement.classList.add(state.theme)
        }
      },
    }
  )
)

// Translations
export const translations = {
  mn: {
    // Header
    privacy: 'Нууцлалын бодлого',
    terms: 'Үйлчилгээний нөхцөл',
    api: 'API',

    // Login
    title: 'Gerege SSO',
    subtitle: 'Нэгдсэн нэвтрэлтийн систем',
    loginWithGoogle: 'Google-ээр нэвтрэх',
    loginWithApple: 'Apple-ээр нэвтрэх',
    loginWithFacebook: 'Facebook-ээр нэвтрэх',
    loginWithX: 'X-ээр нэвтрэх',
    or: 'эсвэл',
    loginDescription: 'Google, Apple эсвэл Facebook бүртгэлээр нэвтэрч, регистрийн дугаараараа баталгаажуулна уу.',
    copyright: '© 2024 Gerege SSO. Бүх эрх хуулиар хамгаалагдсан.',
    checking: 'Шалгаж байна...',
  },
  en: {
    // Header
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    api: 'API',

    // Login
    title: 'Gerege SSO',
    subtitle: 'Single Sign-On System',
    loginWithGoogle: 'Sign in with Google',
    loginWithApple: 'Sign in with Apple',
    loginWithFacebook: 'Sign in with Facebook',
    loginWithX: 'Sign in with X',
    or: 'or',
    loginDescription: 'Sign in with Google, Apple or Facebook and verify with your registration number.',
    copyright: '© 2024 Gerege SSO. All rights reserved.',
    checking: 'Checking...',
  },
}

export function useTranslation() {
  const { language } = useSettingsStore()
  return translations[language]
}
