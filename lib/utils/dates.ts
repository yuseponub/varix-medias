/**
 * Obtiene la fecha actual en formato YYYY-MM-DD en zona horaria de Colombia (UTC-5)
 */
export function getFechaActual(): string {
  const now = new Date()
  // Ajustar a zona horaria de Colombia (UTC-5)
  const colombiaOffset = -5 * 60 // -5 horas en minutos
  const localOffset = now.getTimezoneOffset() // offset del navegador en minutos
  const colombiaTime = new Date(now.getTime() + (colombiaOffset - localOffset) * 60 * 1000)

  const year = colombiaTime.getFullYear()
  const month = String(colombiaTime.getMonth() + 1).padStart(2, '0')
  const day = String(colombiaTime.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Obtiene la hora actual en formato HH:MM:SS en zona horaria de Colombia (UTC-5)
 */
export function getHoraActual(): string {
  const now = new Date()
  // Ajustar a zona horaria de Colombia (UTC-5)
  const colombiaOffset = -5 * 60
  const localOffset = now.getTimezoneOffset()
  const colombiaTime = new Date(now.getTime() + (colombiaOffset - localOffset) * 60 * 1000)

  const hours = String(colombiaTime.getHours()).padStart(2, '0')
  const minutes = String(colombiaTime.getMinutes()).padStart(2, '0')
  const seconds = String(colombiaTime.getSeconds()).padStart(2, '0')

  return `${hours}:${minutes}:${seconds}`
}
