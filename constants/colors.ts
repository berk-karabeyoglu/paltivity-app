export type ColorTheme = {
  background:      string
  surface:         string
  surface2:        string
  border:          string
  textPrimary:     string
  textSecondary:   string
  accent:          string
  accentSecondary: string
  error:           string
  warning:         string
  info:            string
}

export const darkColors: ColorTheme = {
  background:      '#070B10',
  surface:         '#111827',
  surface2:        '#16202D',
  border:          '#1E2D4A',
  textPrimary:     '#F5F7FA',
  textSecondary:   '#94A3B8',
  accent:          '#396afc',
  accentSecondary: '#2948ff',
  error:           '#FF5C7A',
  warning:         '#FFB84D',
  info:            '#93C5FD',
}

export const lightColors: ColorTheme = {
  background:      '#F8FAFC',
  surface:         '#FFFFFF',
  surface2:        '#F1F5F9',
  border:          '#E2E8F0',
  textPrimary:     '#0F172A',
  textSecondary:   '#64748B',
  accent:          '#396afc',
  accentSecondary: '#2948ff',
  error:           '#E11D48',
  warning:         '#D97706',
  info:            '#2563EB',
}

// Default export — auth screens (always dark brand) can still import this directly
export const colors = darkColors
