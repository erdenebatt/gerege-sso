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
      theme: 'light',

      setLanguage: (language) => set({ language }),

      setTheme: (theme) => set({ theme }),

      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: newTheme })
      },
    }),
    {
      name: 'gerege-settings',
      skipHydration: true,
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
    loginDescription:
      'Google, Apple эсвэл Facebook бүртгэлээр нэвтэрч, регистрийн дугаараараа баталгаажуулна уу.',
    copyright: '© 2024 Gerege SSO. Бүх эрх хуулиар хамгаалагдсан.',
    checking: 'Шалгаж байна...',
    emailPlaceholder: 'И-мэйл хаяг',
    sendCode: 'Код илгээх',
    otpPlaceholder: '6 оронтой код',
    verifyCode: 'Баталгаажуулах',
    otpSent: 'Код илгээгдлээ',
    otpResend: 'Дахин илгээх',
    sending: 'Илгээж байна...',
    verifying: 'Шалгаж байна...',
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
    loginDescription:
      'Sign in with Google, Apple or Facebook and verify with your registration number.',
    copyright: '© 2024 Gerege SSO. All rights reserved.',
    checking: 'Checking...',
    emailPlaceholder: 'Email address',
    sendCode: 'Send code',
    otpPlaceholder: '6-digit code',
    verifyCode: 'Verify',
    otpSent: 'Code sent',
    otpResend: 'Resend',
    sending: 'Sending...',
    verifying: 'Verifying...',
  },
}

export function useTranslation() {
  const { language } = useSettingsStore()
  return translations[language]
}
