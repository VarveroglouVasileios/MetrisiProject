/** Renovation estimate: pure pricing logic. Prices are illustrative placeholders, not a real price list. */

export type Space = 'bathroom' | 'kitchen' | 'living' | 'house'
export type Level = 'basic' | 'mid' | 'premium'
export type Extra = 'heating' | 'plumbing' | 'electrical'

export interface Answers {
  space: Space
  area: number
  level: Level
  extras: Extra[]
}

export interface Estimate {
  materials: number
  labour: number
  extras: number
  total: number
  low: number
  high: number
  perM2: number
}

export const SPACES: Record<Space, { label: string; min: number; max: number; presets: number[] }> = {
  bathroom: { label: 'Μπάνιο', min: 3, max: 15, presets: [3, 6, 9] },
  kitchen: { label: 'Κουζίνα', min: 6, max: 30, presets: [8, 12, 18] },
  living: { label: 'Σαλόνι', min: 12, max: 60, presets: [18, 25, 40] },
  house: { label: 'Ολόκληρο σπίτι', min: 40, max: 250, presets: [60, 90, 140] },
}

export const LEVELS: Record<Level, string> = { basic: 'Βασικά', mid: 'Μεσαία', premium: 'Premium' }

export const EXTRAS: Record<Extra, { label: string; perM2: number }> = {
  heating: { label: 'Θέρμανση δαπέδου', perM2: 70 },
  plumbing: { label: 'Νέα υδραυλικά', perM2: 85 },
  electrical: { label: 'Νέα ηλεκτρολογικά', perM2: 55 },
}

/** €/m² [materials, labour] per space and level. */
const RATES: Record<Space, Record<Level, [number, number]>> = {
  bathroom: { basic: [300, 360], mid: [480, 420], premium: [820, 520] },
  kitchen: { basic: [300, 200], mid: [520, 260], premium: [900, 340] },
  living: { basic: [90, 110], mid: [150, 140], premium: [260, 180] },
  house: { basic: [230, 200], mid: [380, 260], premium: [620, 330] },
}

export const SPREAD = { low: 0.92, high: 1.1 }
const round50 = (n: number): number => Math.round(n / 50) * 50
const round10 = (n: number): number => Math.round(n / 10) * 10

export const clampArea = (space: Space, area: number): number => {
  const s = SPACES[space]
  return Number.isFinite(area) ? Math.min(s.max, Math.max(s.min, Math.round(area))) : s.min
}

/** Extras apply to the whole area, except plumbing which only costs full price in wet rooms and the whole house. */
const extraRate = (space: Space, extra: Extra): number => {
  const base = EXTRAS[extra].perM2
  if (extra === 'plumbing' && (space === 'living')) return Math.round(base * 0.4)
  if (extra === 'heating' && space === 'kitchen') return Math.round(base * 0.8)
  return base
}

export function estimate(a: Answers): Estimate {
  const area = clampArea(a.space, a.area)
  const [m, l] = RATES[a.space][a.level]
  const materials = round10(m * area)
  const labour = round10(l * area)
  const extras = round10([...new Set(a.extras)].reduce((sum, e) => sum + extraRate(a.space, e) * area, 0))
  const total = materials + labour + extras
  return { materials, labour, extras, total, low: round50(total * SPREAD.low), high: round50(total * SPREAD.high), perM2: Math.round(total / area) }
}

export const formatNum = (n: number): string => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
export const range = (e: Estimate): string => `${formatNum(e.low)} – ${formatNum(e.high)} €`

export function summary(a: Answers): string {
  const extras = a.extras.length ? `, ${a.extras.map((e) => EXTRAS[e].label.toLowerCase()).join(' και ')}` : ''
  return `${SPACES[a.space].label} ${clampArea(a.space, a.area)} m², ${LEVELS[a.level].toLowerCase()} υλικά${extras}.`
}

// --- visit request ----------------------------------------------------------

export type Errors = Record<string, string>
export const normalizePhone = (s: string): string | null => {
  const d = s.replace(/[\s\-]/g, '').replace(/^(\+30|0030)/, '')
  return /^(69\d{8}|2\d{9})$/.test(d) ? d : null
}

export function validateRequest(i: { name: string; phone: string; when: string }): Errors {
  const e: Errors = {}
  if (i.name.trim().length < 2 || i.name.trim().length > 60) e.name = 'Γράψτε το όνομά σας.'
  if (!normalizePhone(i.phone)) e.phone = 'Γράψτε ελληνικό τηλέφωνο, π.χ. 6912345678.'
  if (!['morning', 'noon', 'evening'].includes(i.when)) e.when = 'Επιλέξτε ώρα που σας βολεύει.'
  return e
}
