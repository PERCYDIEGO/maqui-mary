/**
 * Convierte un monto numérico a texto en español para comprobantes SUNAT
 * Formato: "SON: CIEN Y 50/100 SOLES"
 */

const NUMEROS_BASICOS = [
  '', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
  'VEINTE', 'VEINTIUN', 'VEINTIDOS', 'VEINTITRES', 'VEINTICUATRO', 'VEINTICINCO',
  'VEINTISEIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE',
]

const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']

const CENTENAS_TABLA = [
  '', '', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS',
]

function menorMil(n: number): string {
  if (n === 0) return ''
  if (n < 30) return NUMEROS_BASICOS[n]
  if (n < 100) {
    const d = Math.floor(n / 10)
    const u = n % 10
    return DECENAS[d] + (u > 0 ? ' Y ' + NUMEROS_BASICOS[u] : '')
  }
  const c = Math.floor(n / 100)
  const r = n % 100
  const centenas = c === 1 ? (r === 0 ? 'CIEN' : 'CIENTO') : CENTENAS_TABLA[c]
  return centenas + (r > 0 ? ' ' + menorMil(r) : '')
}

function convertirEntero(n: number): string {
  if (n === 0) return 'CERO'
  const partes: string[] = []
  const millones = Math.floor(n / 1_000_000)
  if (millones > 0) {
    partes.push(millones === 1 ? 'UN MILLON' : menorMil(millones) + ' MILLONES')
    n = n % 1_000_000
  }
  const miles = Math.floor(n / 1_000)
  if (miles > 0) {
    partes.push(miles === 1 ? 'MIL' : menorMil(miles) + ' MIL')
    n = n % 1_000
  }
  if (n > 0) partes.push(menorMil(n))
  return partes.join(' ')
}

export function numeroALetras(monto: number, moneda = 'PEN'): string {
  const [enteroParte, decimalParte = '00'] = monto.toFixed(2).split('.')
  const monedaLabel = moneda === 'USD' ? 'DOLARES' : 'SOLES'
  return `SON: ${convertirEntero(parseInt(enteroParte))} Y ${decimalParte}/100 ${monedaLabel}`
}
