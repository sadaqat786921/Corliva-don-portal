import { CarePlan, Client, ClientDoc, TODAY, Visit } from './seed'

export interface Step { label: string; done: boolean; tab: 'overview' | 'people' | 'plan' | 'documents' | 'visits' }

/** What must be in place before a new client is fully set up (BRD User Flow 1, steps 8–10). */
export function onboarding(c: Client, plans: CarePlan[], docs: ClientDoc[], visits: Visit[]): Step[] {
  return [
    { label: 'Home address', done: !!c.address.trim(), tab: 'overview' },
    { label: 'Access instructions (how to get in)', done: !!c.access.trim(), tab: 'overview' },
    { label: 'Emergency contact', done: c.people.some(p => p.emergency), tab: 'people' },
    { label: 'Signed service agreement uploaded', done: docs.some(d => d.clientId === c.id && d.category === 'Service agreement' && d.status !== 'Replaced'), tab: 'documents' },
    { label: 'Care plan approved by the Care Supervisor', done: plans.some(p => p.clientId === c.id && p.status === 'Approved'), tab: 'plan' },
    { label: 'First visits planned', done: visits.some(v => v.clientId === c.id && v.status !== 'Cancelled'), tab: 'visits' },
  ]
}

/** The care plan in use (approved) and the one being worked on (draft / awaiting review / changes requested). */
export function plansFor(clientId: string, plans: CarePlan[]) {
  const mine = plans.filter(p => p.clientId === clientId).sort((a, b) => b.version - a.version)
  return { current: mine.find(p => p.status === 'Approved'), working: mine.find(p => ['Draft', 'Awaiting review', 'Changes requested'].includes(p.status)), all: mine }
}

/** The approved plan that applied on the day of a visit (CP-07: later versions never change what applied to a finished visit). */
export function planForVisit(v: { clientId: string; date: string }, plans: CarePlan[]) {
  return plans.filter(p => p.clientId === v.clientId && (p.status === 'Approved' || p.status === 'Superseded') && (p.effectiveDate ?? '') <= v.date).sort((a, b) => b.version - a.version)[0] ?? plansFor(v.clientId, plans).current
}
export const reviewDue = (p: CarePlan | undefined) => !!p && !!p.reviewDate && p.reviewDate <= addDaysIso(14)
export const reviewOverdue = (p: CarePlan | undefined) => !!p && !!p.reviewDate && p.reviewDate < TODAY
function addDaysIso(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
