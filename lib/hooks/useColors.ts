import { useTheme } from '../providers/ThemeProvider'
import { ColorTheme } from '../../constants/colors'

export function useColors(): ColorTheme {
  return useTheme().colors
}
