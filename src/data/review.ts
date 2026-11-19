import { CarePlan, Visit } from './seed'

export const mins = (hm: string) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m }
export const hrs = (n: number) => `${Math.floor(n / 60)}h ${String(n % 60).padStart(2, '0')}m`
/** Planned length of a visit, in minutes. */
export const plannedMins = (v: Visit) => mins(v.end) - mins(v.start)
/** Length the caregiver app recorded, in minutes (null if there is no check-out). */
export const actualMins = (v: Visit) => v.checkIn && v.checkOut ? mins(v.checkOut) - mins(v.checkIn) : null

export interface Flag { key: 'checkout' | 'late' | 'short' | 'long' | 'place' | 'tasks'; title: string; text: string; tone: 'danger' | 'warning'; stopsApproval?: boolean }

/** Things the caregiver app picked up that the Care Supervisor should look at before approving. */
export function serviceFlags(v: Visit, plan: CarePlan | undefined, lateMins = 15): Flag[] {
  const out: Flag[] = []
  if (v.checkIn && !v.checkOut) out.push({ key: 'checkout', title: 'No check-out', text: 'The caregiver didn’t check out. Correct the finish time before approving.', tone: 'danger', stopsApproval: true })
  if (v.checkIn && mins(v.checkIn) - mins(v.start) > lateMins) out.push({ key: 'late', title: 'Started late', text: `Checked in ${mins(v.checkIn) - mins(v.start)} minutes after the planned start.`, tone: 'warning' })
  const a = actualMins(v)
  if (a !== null && plannedMins(v) - a > lateMins) out.push({ key: 'short', title: 'Shorter than planned', text: `${hrs(a)} instead of ${hrs(plannedMins(v))}.`, tone: 'warning' })
  if (a !== null && a - plannedMins(v) > 60) out.push({ key: 'long', title: 'Much longer than planned', text: `${hrs(a)} instead of ${hrs(plannedMins(v))}. Check the times.`, tone: 'danger' })
  if (v.place && v.place !== 'At the client’s home') out.push({ key: 'place', title: 'Checked in away from the home', text: `${v.place}.`, tone: 'warning' })
  const missed = (plan?.tasks ?? []).filter(t => !(v.tasksDone ?? []).includes(t))
  if (v.tasksDone && missed.length) out.push({ key: 'tasks', title: 'Tasks not done', text: `${missed.join(', ')}${v.tasksNote ? ` — “${v.tasksNote}”` : ''}`, tone: 'warning' })
  return out
}

/** A finished visit waiting for the Care Supervisor (not sent back, not approved yet). */
export const toReview = (v: Visit) => v.approval === 'To review'
