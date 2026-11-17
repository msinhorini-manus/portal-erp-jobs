export function safeEmployerLogo(value?: string | null): string | null {
  if (typeof value !== 'string') return null
  const source = value.trim()
  if (!source || source.length > 2048 || /[\u0000-\u001f\u007f\\]/.test(source)) return null
  if (source.startsWith('/')) {
    if (source.startsWith('//') || !/^\/(?:uploads|static|brand|media)(?:\/|$)/.test(source)) return null
    return source
  }
  try {
    const url = new URL(source)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    return url.href
  } catch {
    return null
  }
}

export function employerInitials(name?: string | null): string {
  if (typeof name !== 'string' || !name.trim()) return 'EM'
  const words = name.trim().split(/\s+/)
  const first = words[0]
  if (/^[A-ZÀ-Ý]{2,3}$/.test(first)) return first
  if (words.length === 1) return Array.from(first).slice(0, 2).join('').toLocaleUpperCase('pt-BR')
  return words.slice(0, 2).map(word => Array.from(word)[0]).join('').toLocaleUpperCase('pt-BR')
}
