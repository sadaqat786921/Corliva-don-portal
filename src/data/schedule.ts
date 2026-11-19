import { CarePlan, Caregiver, Client, TODAY, Visit, nowHM, rules } from './seed'
import { hoursBetween } from './store'

const weekStart = (isoDate: string) => { const [y, m, d] = isoDate.split('-').map(Number); const x = new Date(y, m - 1, d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
const isoOf = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
export const dayOfWeek = (isoDate: string) => { const [y, m, d] = isoDate.split('-').map(Number); return new Date(y, m - 1, d).getDay() }
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const live = (v: Visit) => v.status !== 'Cancelled'

/** Hours a caregiver is already booked for in the week of a date. */
export function weekHours(gid: string, date: string, visits: Visit[], skipId?: string) {
  const from = isoOf(weekStart(date)); const toD = weekStart(date); toD.setDate(toD.getDate() + 6); const to = isoOf(toD)
  return visits.filter(v => v.caregiverId === gid && v.id !== skipId && live(v) && v.date >= from && v.date <= to).reduce((a, v) => a + hoursBetween(v.start, v.end), 0)
}

export interface Check { blocking: string[]; warnings: string[]; good: string[] }

/** Checks a caregiver against a visit. Blocking stops the assignment; warnings only remind. */
export function checkCaregiver(g: Caregiver, v: Pick<Visit, 'id' | 'clientId' | 'date' | 'start' | 'end' | 'service'>, visits: Visit[]): Check {
  const blocking: string[] = [], warnings: string[] = [], good: string[] = []
  if (g.readiness === 'Blocked') blocking.push(`Not ready to work: ${g.issue?.toLowerCase()}`)
  if (!g.skills.includes(v.service)) blocking.push(`Not trained for ${v.service.toLowerCase()}`)
  const clash = visits.find(x => x.id !== v.id && x.caregiverId === g.id && x.date === v.date && live(x) && x.start < v.end && v.start < x.end)
  if (clash) blocking.push(`Already on another visit ${clash.start}–${clash.end}`)
  if (g.readiness === 'Warning') warnings.push(g.issue ?? 'Has a reminder from HR')
  if (!g.days.includes(dayOfWeek(v.date)) || v.start < g.from || v.end > g.to) warnings.push(`Usually works ${g.days.map(d => DAY_NAMES[d]).join(', ')} ${g.from}–${g.to}`)
  const after = weekHours(g.id, v.date, visits, v.id) + hoursBetween(v.start, v.end)
  if (after > g.maxHours) warnings.push(`Would work ${after} hours this week (limit ${g.maxHours})`)
  const knows = visits.some(x => x.caregiverId === g.id && x.clientId === v.clientId && x.status === 'Completed')
  if (knows) good.push('Knows this client'); else warnings.push('Has not visited this client before')
  if (!blocking.length && !warnings.filter(w => !w.startsWith('Has not')).length) good.push('Free and ready')
  return { blocking, warnings, good }
}

/** A client can only have visits planned once they are active and have an approved care plan. */
export function canSchedule(c: Client | undefined, plans: CarePlan[]): { ok: boolean; why: string } {
  if (!c) return { ok: false, why: 'Client not found.' }
  if (c.status !== 'Active') return { ok: false, why: `${c.name} is ${c.status.toLowerCase()}.` }
  if (!plans.some(p => p.clientId === c.id && p.status === 'Approved')) return { ok: false, why: `${c.name} has no approved care plan yet. The Care Supervisor must approve it first.` }
  return { ok: true, why: '' }
}

export type LiveState = 'No caregiver' | 'Late' | 'In progress' | 'Done' | 'Due soon' | 'Later today' | 'Cancelled'
/** Where today's visit is up to right now. */
export function liveState(v: Visit): LiveState {
  if (v.status === 'Cancelled') return 'Cancelled'
  if (v.status === 'Completed' || v.checkOut) return 'Done'
  if (!v.caregiverId) return 'No caregiver'
  if (v.checkIn) return 'In progress'
  const now = nowHM()
  const lateAt = (() => { const [h, m] = v.start.split(':').map(Number); const t = h * 60 + m + rules.lateArrivalMins; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` })()
  if (v.date === TODAY && now >= lateAt) return 'Late'
  if (v.date === TODAY && hoursBetween(now, v.start) <= 1 && v.start >= now) return 'Due soon'
  return 'Later today'
}
export const minutesLate = (v: Visit) => Math.max(0, Math.round(hoursBetween(v.start, nowHM()) * 60))

export interface CoverItem { visit: Visit; kind: 'No caregiver' | 'Caregiver not ready' | 'Needs review' | 'Late check-in'; detail: string }
/** Every upcoming visit that needs the coordinator's attention. */
export function coverQueue(visits: Visit[], caregivers: Caregiver[], inBranch: (b: string) => boolean): CoverItem[] {
  const out: CoverItem[] = []
  for (const v of visits) {
    if (!inBranch(v.branch) || v.date < TODAY || v.status === 'Cancelled' || v.status === 'Completed') continue
    const g = caregivers.find(x => x.id === v.caregiverId)
    if (!v.caregiverId) out.push({ visit: v, kind: 'No caregiver', detail: 'Nobody is assigned yet.' })
    else if (g?.readiness === 'Blocked') out.push({ visit: v, kind: 'Caregiver not ready', detail: `${g.name}: ${g.issue?.toLowerCase()}.` })
    else if (v.review) out.push({ visit: v, kind: 'Needs review', detail: v.review })
    else if (v.date === TODAY && liveState(v) === 'Late') out.push({ visit: v, kind: 'Late check-in', detail: `${g?.name} has not checked in.` })
  }
  return out.sort((a, b) => (a.visit.date + a.visit.start).localeCompare(b.visit.date + b.visit.start))
}
