import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ColorTheme, darkColors, lightColors } from '../../constants/colors'

type ThemeMode = 'dark' | 'light'

type ThemeContextValue = {
  theme: ThemeMode
  colors: ColorTheme
  toggleTheme: () => void
  setTheme: (theme: ThemeMode) => void
}

const STORAGE_KEY = '@paltivity_theme'

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  colors: darkColors,
  toggleTheme: () => {},
  setTheme: () => {},
})

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark') {
        setThemeState(saved)
      }
    })
  }, [])

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next)
    AsyncStorage.setItem(STORAGE_KEY, next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      AsyncStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  // darkColors / lightColors module-level sabitler — tema değişmediğinde aynı referans
  const colors = theme === 'dark' ? darkColors : lightColors

  const value = useMemo(
    () => ({ theme, colors, toggleTheme, setTheme }),
    [theme, colors, toggleTheme, setTheme]
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
