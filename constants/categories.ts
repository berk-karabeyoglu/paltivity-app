export const CATEGORIES = [
  { id: 1, name: 'Spor', icon: '⚽' },
  { id: 2, name: 'Müzik', icon: '🎵' },
  { id: 3, name: 'Sanat', icon: '🎨' },
  { id: 4, name: 'Yemek', icon: '🍕' },
  { id: 5, name: 'Doğa', icon: '🏕️' },
  { id: 6, name: 'Oyun', icon: '🎮' },
  { id: 7, name: 'Eğitim', icon: '📚' },
  { id: 9, name: 'Eğlence', icon: '🎉' },
  { id: 8, name: 'Diğer', icon: '✨' },
] as const

export const CATEGORIES_WITH_ALL = [
  { id: null, name: 'Tümü', icon: '✨' },
  ...CATEGORIES,
] as const
