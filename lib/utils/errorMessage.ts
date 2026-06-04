const errorMap: Record<string, string> = {
  'invalid login credentials': 'E-posta veya şifre hatalı.',
  'invalid_credentials': 'E-posta veya şifre hatalı.',
  'email not confirmed': 'E-posta adresin henüz doğrulanmamış. Gelen kutunu kontrol et.',
  'user already registered': 'Bu e-posta adresi zaten kayıtlı.',
  'email already in use': 'Bu e-posta adresi zaten kullanılıyor.',
  'database error saving new user': 'Bu e-posta adresi zaten kayıtlı.',
  'password should be at least 6 characters': 'Şifre en az 6 karakter olmalı.',
  'password should be at least 8 characters': 'Şifre en az 8 karakter olmalı.',
  'unable to validate email address: invalid format': 'Geçersiz e-posta formatı.',
  'email address is invalid': 'Geçersiz e-posta adresi.',
  'signup is disabled': 'Kayıt şu an devre dışı.',
  'email rate limit exceeded': 'Çok fazla deneme yaptın. Biraz bekle.',
  'too many requests': 'Çok fazla istek gönderildi. Lütfen bekle.',
  'network request failed': 'İnternet bağlantını kontrol et.',
  'auth session missing': 'Oturum bulunamadı. Tekrar giriş yap.',
  'session not found': 'Oturum bulunamadı. Tekrar giriş yap.',
  'token has expired': 'Bağlantının süresi dolmuş. Yeni link talep et.',
  'invalid token': 'Geçersiz bağlantı.',
  'user not found': 'Kullanıcı bulunamadı.',
  'new password should be different from the old password': 'Yeni şifre eski şifrenden farklı olmalı.',
  'same_password': 'Yeni şifre eski şifrenden farklı olmalı.',
  'weak_password': 'Şifre çok zayıf. Daha güçlü bir şifre seç.',
}

export function toTurkishError(message?: string): string {
  if (!message) return 'Bir hata oluştu. Tekrar dene.'
  const lower = message.toLowerCase()
  for (const [key, value] of Object.entries(errorMap)) {
    if (lower.includes(key)) return value
  }
  return 'Bir hata oluştu. Tekrar dene.'
}
