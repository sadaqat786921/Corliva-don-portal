import { Caregiver, Client, StaffReview, TODAY, Training, User, addDays } from './seed'

/** Everyone the Director of Nursing reviews and trains: caregivers and Care Supervisors. */
export interface StaffPerson { id: string; name: string; role: string; branch: string }
export const staffPeople = (caregivers: Caregiver[], users: User[]): StaffPerson[] => [
  ...users.filter(u => u.role === 'Care Supervisor' && u.status === 'Active').map(u => ({ id: u.id, name: u.name, role: 'Care Supervisor', branch: u.branch })),
  ...caregivers.map(g => ({ id: g.id, name: g.name, role: g.type, branch: g.branch })),
]

export type ReviewState = 'Overdue' | 'Due soon' | 'Up to date'
export const reviewState = (r: StaffReview): ReviewState => r.due < TODAY ? 'Overdue' : r.due <= addDays(30) ? 'Due soon' : 'Up to date'

/** A past session where nobody has recorded who came yet. */
export const attendanceMissing = (t: Training) => t.date < TODAY && t.attended === null

/** The Care Supervisor who looks after a branch. */
export const supervisorOf = (branch: string, users: User[]) => users.find(u => u.role === 'Care Supervisor' && u.status === 'Active' && u.branch === branch)

/** Newest health update, if any. */
export const lastHealth = (c: Client) => (c.health ?? []).slice().sort((a, b) => b.date.localeCompare(a.date))[0]
/** High-risk clients should have a health update at least every 7 days. */
export const checkInDue = (c: Client) => c.status !== 'Discharged' && c.risk?.level === 'High' && (!lastHealth(c) || lastHealth(c)!.date < addDays(-7))
