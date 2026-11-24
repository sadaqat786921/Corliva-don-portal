// Demo data for the CORLIVA Director of Nursing portal.
// The signed-in person is Patricia Reyes, RN, Director of Nursing for the whole agency.
// Michael Brooks is Care Supervisor for North Branch, Laura Chen for South Branch.
// Everything is relative to "today" so the demo always looks current.

export type Role =
  | 'Agency Admin'
  | 'Care Coordinator'
  | 'Care Supervisor'
  | 'Director of Nursing'
  | 'HR Officer'
  | 'Finance Officer'
  | 'Caregiver'
  | 'Client / Family'

export interface Branch { id: string; name: string }
export interface User { id: string; name: string; email: string; role: Role; branch: string; status: 'Invited' | 'Active' | 'Switched off'; phone: string }
export interface ListItem { id: string; name: string; active: boolean; note?: string }
export interface Note { by: string; at: string; text: string }

/* ---- Clients ---- */
export interface Person { id: string; name: string; relationship: string; phone: string; email: string; emergency: boolean; representative: boolean; appAccess: 'No access' | 'Invited' | 'Active' | 'Removed' }
export interface Client {
  id: string; name: string; dob: string; branch: string; status: 'Active' | 'On hold' | 'Discharged'; coordinator: string
  services: string; since: string; phone: string; address: string; payer: string
  language: string; preferences: string; access: string; people: Person[]; fromReferral?: string
  statusReason?: string; history: Note[]
  /** What the home assessment found (copied over when the referral became a client). */
  assessment?: { date: string; by: string; needs: string; risks: string; mobility: string; hours: number | null }
  /** How closely the Director of Nursing is watching this client's health. */
  risk?: { level: RiskLevel; why: string; by: string; date: string }
  /** Health updates: changes in health, hospital stays, calls with family, nurse home visits. */
  health?: HealthNote[]
}
export type RiskLevel = 'High' | 'Medium' | 'Low'
export const HEALTH_TYPES = ['Change in health', 'Hospital stay', 'Call with family', 'Nurse home visit', 'Other'] as const
export interface HealthNote { by: string; at: string; date: string; type: typeof HEALTH_TYPES[number]; text: string }

/* ---- Staff reviews and training (Director of Nursing) ---- */
export type ReviewOutcome = 'Meets standards' | 'Needs to improve' | 'Above standards'
export interface StaffReview { id: string; personId: string; due: string; history: { date: string; by: string; outcome: ReviewOutcome; note: string }[] }
export interface Training { id: string; title: string; date: string; time: string; place: string; trainer: string; invited: string[]; attended: string[] | null; note?: string; added: string }

/* ---- Care plans (Coordinator drafts, Care Supervisor approves) ---- */
export type PlanStatus = 'Draft' | 'Awaiting review' | 'Approved' | 'Changes requested' | 'Superseded'
export interface CarePlan {
  id: string; clientId: string; version: number; status: PlanStatus
  services: string[]; tasks: string[]; instructions: string; goals: string; hoursPerWeek: number | null; reviewDate: string
  createdBy: string; createdDate: string; submittedDate?: string; approvedBy?: string; approvedDate?: string; effectiveDate?: string
  comments: Note[]
  /** Planned review of an approved plan, recorded by the Care Supervisor. */
  lastReview?: { by: string; date: string; outcome: 'No changes needed' | 'Changes needed'; note: string }
}

/* ---- Documents (uploading does not mean checked) ---- */
export type DocStatus = 'Not checked' | 'Checked' | 'Rejected' | 'Not needed' | 'Replaced'
export interface ClientDoc { id: string; clientId: string; name: string; category: string; uploadedBy: string; date: string; expiry?: string; status: DocStatus; checkedBy?: string; checkedDate?: string; reason?: string }

/* ---- Caregiver checks the Care Supervisor is responsible for (HR handles the rest) ---- */
export type CheckStatus = 'To do' | 'Waiting for check' | 'Checked' | 'Rejected' | 'Expired' | 'Not needed'
export interface CgCheck { id: string; caregiverId: string; name: string; why: string; blocking: boolean; status: CheckStatus; due?: string; expiry?: string; evidence?: string; checkedBy?: string; checkedDate?: string; reason?: string }
export const DOC_CATEGORIES = ['Service agreement', 'Signed care plan', 'Hospital discharge letter', 'Insurance or funding letter', 'Photo ID', 'Consent form', 'Other']

/* ---- Caregivers (HR keeps these; Coordinators view them to match visits) ---- */
export interface Caregiver {
  id: string; name: string; branch: string; type: 'Certified aide' | 'Companion' | 'Home health aide'
  skills: string[]; days: number[]; from: string; to: string; maxHours: number
  readiness: 'Ready' | 'Warning' | 'Blocked'; issue?: string; phone: string
}

/* ---- Visits ---- */
export type VisitStatus = 'Scheduled' | 'In progress' | 'Completed' | 'Unassigned' | 'Cancelled'
export interface Visit {
  id: string; clientId: string; caregiverId: string | null; date: string; start: string; end: string; branch: string; service: string
  status: VisitStatus; series?: string; checkIn?: string; checkOut?: string; review?: string; coverNote?: string; cancelReason?: string
  /* ---- What the caregiver app recorded, and the Care Supervisor's check ---- */
  approval?: 'To review' | 'Sent back' | 'Approved'
  place?: string            // where they checked in: "At the client’s home" or how far away
  tasksDone?: string[]      // care plan tasks ticked off in the app
  tasksNote?: string        // why a task wasn't done
  cgNote?: string           // the caregiver's note at check-out
  original?: { checkIn?: string; checkOut?: string }   // times before a correction (kept)
  returned?: { reason: string; by: string; at: string }
  approvedBy?: string; approvedAt?: string
  billing?: 'Invoiced'      // set by Finance; after this, changes need an adjustment
  adjustment?: { reason: string; by: string; at: string; before: string; after: string; status: 'Sent to Finance' }
  override?: { reason: string; by: string; at: string }
}

export type IncidentStatus = 'Reported' | 'Under review' | 'Action required' | 'Resolved' | 'Closed'
export interface IncidentAction { id: string; text: string; who: string; due: string; done: boolean; doneAt?: string }
export interface Incident { id: string; title: string; category: string; severity: 'Low' | 'Medium' | 'High'; client: string; caregiver?: string; reportedBy: string; date: string; owner: string; due: string; status: IncidentStatus; branch: string; sensitive: boolean; notes: Note[]
  findings: string; actions: IncidentAction[]; resolution?: string; closingNote?: string }
export interface AuditEntry { id: string; at: string; actor: string; action: string; record: string; type: string; before?: string; after?: string; reason?: string }
export interface Inbox { id: string; title: string; body: string; at: string; read: boolean; link: string; tone: 'danger' | 'warning' | 'info' | 'success' }

const pad = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d) }
export const TODAY = addDays(0)
export const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
const shift = (hm: string, mins: number) => { const [h, m] = hm.split(':').map(Number); const t = Math.max(0, Math.min(23 * 60 + 59, h * 60 + m + mins)); return `${pad(Math.floor(t / 60))}:${pad(t % 60)}` }

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** Display stamp like "12 Nov, 10:15" for a day offset from today. */
export const stampFor = (dayOffset: number, time: string) => { const d = new Date(); d.setDate(d.getDate() + dayOffset); return `${d.getDate()} ${MON[d.getMonth()]}, ${time}` }

export const ME = { name: 'Patricia Reyes', role: 'Director of Nursing' as Role, branch: 'all', email: 'patricia@royalityhomecare.com', phone: '(217) 555-0109', initials: 'PR' }

export const ROLES: { role: Role; does: string }[] = [
  { role: 'Care Coordinator', does: 'Handles referrals, client set-up, care plan drafts, schedules, finding cover and family requests.' },
  { role: 'Care Supervisor', does: 'Approves care plans, reviews finished visits, checks documents and skills, owns incidents and can make exceptions to blocking rules.' },
  { role: 'Director of Nursing', does: 'Registered nurse in charge of care quality for the whole agency. Can do everything a Care Supervisor does, watches every client’s health, runs quality and risk, reviews and trains staff.' },
]

export const branches: Branch[] = [{ id: 'north', name: 'North Branch' }, { id: 'south', name: 'South Branch' }]

export const users: User[] = [
  { id: 'u0', name: 'Fred Morgan', email: 'fred@royalityhomecare.com', role: 'Agency Admin', branch: 'all', status: 'Active', phone: '(217) 555-0100' },
  { id: 'u1', name: 'Aisha Rahman', email: 'aisha@royalityhomecare.com', role: 'Care Coordinator', branch: 'north', status: 'Active', phone: '(217) 555-0101' },
  { id: 'u10', name: 'Patricia Reyes', email: 'patricia@royalityhomecare.com', role: 'Director of Nursing', branch: 'all', status: 'Active', phone: '(217) 555-0109' },
  { id: 'u9', name: 'Laura Chen', email: 'laura@royalityhomecare.com', role: 'Care Supervisor', branch: 'south', status: 'Active', phone: '(217) 555-0112' },
  { id: 'u2', name: 'Michael Brooks', email: 'michael@royalityhomecare.com', role: 'Care Supervisor', branch: 'north', status: 'Active', phone: '(217) 555-0102' },
  { id: 'u3', name: 'Lena Ortiz', email: 'lena@royalityhomecare.com', role: 'HR Officer', branch: 'north', status: 'Active', phone: '(217) 555-0103' },
  { id: 'u8', name: 'Sara Kim', email: 'sara@royalityhomecare.com', role: 'Care Coordinator', branch: 'north', status: 'Active', phone: '(217) 555-0108' },
  { id: 'u4', name: 'Daniel Reed', email: 'daniel@royalityhomecare.com', role: 'Care Coordinator', branch: 'south', status: 'Active', phone: '(217) 555-0104' },
  { id: 'u5', name: 'Omar Haddad', email: 'omar@royalityhomecare.com', role: 'Finance Officer', branch: 'all', status: 'Active', phone: '(217) 555-0105' },
]

export const lists: Record<string, ListItem[]> = {
  services: [
    { id: 's1', name: 'Personal care', active: true, note: 'Bathing, dressing, toileting' },
    { id: 's2', name: 'Companionship', active: true, note: 'Company, outings, conversation' },
    { id: 's3', name: 'Homemaking', active: true, note: 'Light cleaning, laundry, meals' },
    { id: 's4', name: 'Respite care', active: true, note: 'Short breaks for family carers' },
    { id: 's5', name: 'Medication reminders', active: true, note: 'Prompts only, no administering' },
  ],
  sources: [
    { id: 'r1', name: 'Hospital discharge', active: true }, { id: 'r2', name: 'Family or friend', active: true }, { id: 'r3', name: 'Doctor’s office', active: true },
    { id: 'r4', name: 'Website enquiry', active: true }, { id: 'r5', name: 'Insurance or care manager', active: true },
  ],
  tasks: [
    { id: 't1', name: 'Help with bathing', active: true }, { id: 't2', name: 'Help getting dressed', active: true }, { id: 't3', name: 'Prepare a meal', active: true },
    { id: 't4', name: 'Medication reminder', active: true }, { id: 't5', name: 'Light housekeeping', active: true }, { id: 't6', name: 'Walk or gentle exercise', active: true },
    { id: 't7', name: 'Laundry', active: true }, { id: 't8', name: 'Company and conversation', active: true },
  ],
  incidents: [
    { id: 'i1', name: 'Fall', active: true }, { id: 'i2', name: 'Medication concern', active: true }, { id: 'i3', name: 'Missed visit', active: true },
    { id: 'i4', name: 'Injury to caregiver', active: true }, { id: 'i5', name: 'Complaint', active: true }, { id: 'i6', name: 'Safeguarding concern', active: true, note: 'Only approved roles can see these' },
  ],
  reasons: [
    { id: 'c1', name: 'Client in hospital', active: true }, { id: 'c2', name: 'Client asked to cancel', active: true },
    { id: 'c3', name: 'No caregiver available', active: true }, { id: 'c4', name: 'Weather or travel problem', active: true },
  ],
}

/** Set by the Agency Admin. Care Coordinators are not on the override list. */
export const rules = { overrideRoles: ['Agency Admin', 'Care Supervisor', 'Director of Nursing'] as Role[], lateArrivalMins: 15 }

export const caregivers: Caregiver[] = [
  { id: 'g1', name: 'Grace Mensah', branch: 'north', type: 'Certified aide', skills: ['Personal care', 'Medication reminders', 'Homemaking', 'Companionship'], days: [1, 2, 3, 4, 5, 6], from: '07:00', to: '15:00', maxHours: 40, readiness: 'Ready', phone: '(217) 555-0201' },
  { id: 'g2', name: 'Daniel Osei', branch: 'north', type: 'Certified aide', skills: ['Personal care', 'Medication reminders', 'Respite care'], days: [1, 2, 3, 4, 5], from: '08:00', to: '18:00', maxHours: 40, readiness: 'Blocked', issue: 'First-aid certificate expired', phone: '(217) 555-0202' },
  { id: 'g3', name: 'Maria Lopez', branch: 'north', type: 'Certified aide', skills: ['Personal care', 'Medication reminders', 'Companionship', 'Homemaking'], days: [0, 1, 2, 3, 4, 5, 6], from: '10:00', to: '19:00', maxHours: 40, readiness: 'Ready', phone: '(217) 555-0203' },
  { id: 'g7', name: 'Hannah Lee', branch: 'north', type: 'Companion', skills: ['Companionship', 'Homemaking'], days: [1, 2, 3, 4, 5], from: '09:00', to: '17:00', maxHours: 30, readiness: 'Blocked', issue: 'Background check not verified', phone: '(217) 555-0207' },
  { id: 'g9', name: 'Rosa Diaz', branch: 'north', type: 'Home health aide', skills: ['Personal care', 'Medication reminders', 'Respite care', 'Homemaking'], days: [0, 1, 2, 3, 4, 5, 6], from: '06:00', to: '14:00', maxHours: 40, readiness: 'Ready', phone: '(217) 555-0209' },
  { id: 'g10', name: 'Ben Okafor', branch: 'north', type: 'Certified aide', skills: ['Personal care', 'Companionship', 'Respite care'], days: [1, 2, 3, 4, 5, 6], from: '09:00', to: '17:00', maxHours: 35, readiness: 'Warning', issue: 'Annual training due in 9 days', phone: '(217) 555-0210' },
  { id: 'g11', name: 'Lily Chen', branch: 'north', type: 'Companion', skills: ['Companionship', 'Homemaking'], days: [0, 2, 4, 6], from: '12:00', to: '20:00', maxHours: 24, readiness: 'Ready', phone: '(217) 555-0211' },
  { id: 'g5', name: 'Sofia Novak', branch: 'south', type: 'Certified aide', skills: ['Personal care', 'Homemaking'], days: [1, 2, 3, 4, 5], from: '08:00', to: '16:00', maxHours: 40, readiness: 'Ready', phone: '(217) 555-0205' },
  { id: 'g6', name: 'James Carter', branch: 'south', type: 'Companion', skills: ['Companionship', 'Homemaking'], days: [0, 1, 2, 3, 4, 5, 6], from: '09:00', to: '18:00', maxHours: 35, readiness: 'Ready', phone: '(217) 555-0206' },
]

const P = (id: string, name: string, relationship: string, phone: string, email: string, emergency: boolean, representative: boolean, appAccess: Person['appAccess']): Person => ({ id, name, relationship, phone, email, emergency, representative, appAccess })
export const clients: Client[] = [
  { id: 'c1', name: 'Margaret Hale', dob: '1937-05-02', branch: 'north', status: 'Active', coordinator: 'Aisha Rahman', services: 'Personal care, Medication reminders', since: 'Mar 2025', phone: '(217) 555-0311', address: '14 Elm St, Springfield, IL 62701', payer: 'Long-term care insurance', language: 'English', preferences: 'Prefers female caregivers. Likes a cup of tea after her bath.', access: 'Key safe by the front door, code given by phone. Small dog — friendly.',
    people: [P('p1', 'Susan Hale', 'Daughter', '(217) 555-0611', 'susan.hale@example.com', true, true, 'Active'), P('p2', 'Tom Hale', 'Son', '(217) 555-0612', '', true, false, 'No access')], history: [] },
  { id: 'c2', name: 'Robert King', dob: '1944-10-19', branch: 'north', status: 'Active', coordinator: 'Aisha Rahman', services: 'Companionship', since: 'Jan 2026', phone: '(217) 555-0312', address: '9 Oak Lane, Springfield, IL 62702', payer: 'Private pay', language: 'English', preferences: 'Loves baseball and short walks to the park.', access: 'Ring the bell twice. Hard of hearing.',
    people: [P('p3', 'Mark King', 'Son', '(217) 555-0613', 'mark.king@example.com', true, true, 'Active')], history: [] },
  { id: 'c5', name: 'Dorothy Fields', dob: '1935-02-11', branch: 'north', status: 'On hold', coordinator: 'Aisha Rahman', services: 'Personal care', since: 'Nov 2024', phone: '(217) 555-0315', address: '31 Maple Dr, Springfield, IL 62704', payer: 'Private pay', language: 'English', preferences: '', access: 'Son lets carers in.', statusReason: 'In hospital since 2 Nov',
    people: [P('p4', 'Jim Fields', 'Son', '(217) 555-0615', 'jim.fields@example.com', true, true, 'Invited')], history: [{ by: 'Aisha Rahman', at: '2 Nov, 09:10', text: 'Put on hold. Reason: in hospital since 2 Nov.' }] },
  { id: 'c6', name: 'Harold Jenkins', dob: '1940-08-19', branch: 'north', status: 'Active', coordinator: 'Aisha Rahman', services: 'Medication reminders', since: 'Sep 2026', phone: '(217) 555-0316', address: '88 Cedar Ave, Springfield, IL 62701', payer: 'Private pay', language: 'English', preferences: 'Afternoon visits only.', access: 'Wife at home to let carers in.',
    people: [P('p5', 'Linda Jenkins', 'Wife', '(217) 555-0418', '', true, true, 'No access')], fromReferral: 'R-1020', history: [] },
  { id: 'c9', name: 'Edith Morris', dob: '1939-12-07', branch: 'north', status: 'Active', coordinator: 'Aisha Rahman', services: 'Personal care', since: 'May 2026', phone: '(217) 555-0319', address: '40 Grove St, Springfield, IL 62702', payer: 'Long-term care insurance', language: 'English', preferences: 'Early riser. Likes porridge for breakfast.', access: 'Key under the blue pot (agreed with family).',
    people: [P('p6', 'Paul Morris', 'Son', '(217) 555-0619', 'paul.morris@example.com', true, true, 'Active')], history: [] },
  { id: 'c12', name: 'Samuel Grant', dob: '1942-03-28', branch: 'north', status: 'Active', coordinator: 'Sara Kim', services: 'Personal care', since: 'Dec 2025', phone: '(217) 555-0322', address: '27 Park Ave, Springfield, IL 62701', payer: 'Private pay', language: 'English, some Spanish', preferences: 'Uses a walking frame indoors.', access: 'Wife at home.',
    people: [P('p7', 'Ruth Grant', 'Wife', '(217) 555-0622', '', true, true, 'No access')], history: [] },
  { id: 'c13', name: 'Gloria Vance', dob: '1946-07-15', branch: 'north', status: 'Active', coordinator: 'Aisha Rahman', services: 'Personal care, Homemaking', since: 'Nov 2026', phone: '(217) 555-0323', address: '', payer: 'Medicaid waiver', language: 'English', preferences: '', access: '',
    people: [P('p8', 'Rita Vance', 'Sister', '(217) 555-0623', 'rita.vance@example.com', true, true, 'No access')], fromReferral: 'R-1010', history: [],
    assessment: { date: addDays(-6), by: 'Michael Brooks', needs: 'Help washing and dressing; light housework while her hip heals.', risks: 'Moving home to a ground-floor flat. Address to confirm.', mobility: 'Walks with a frame', hours: 10 } },
  { id: 'c3', name: 'Evelyn Price', dob: '1941-01-09', branch: 'south', status: 'Active', coordinator: 'Daniel Reed', services: 'Homemaking, Personal care', since: 'Aug 2025', phone: '(217) 555-0313', address: '72 River Rd, Springfield, IL 62703', payer: 'Medicaid waiver', language: 'English', preferences: 'Likes the radio on. Keeps a tidy kitchen.', access: 'Front door unlocked from 8am.',
    people: [P('p9', 'Carl Price', 'Nephew', '(217) 555-0624', 'carl.price@example.com', true, true, 'Active')], history: [] },
  { id: 'c14', name: 'Walter Brooks', dob: '1938-09-23', branch: 'south', status: 'Active', coordinator: 'Daniel Reed', services: 'Companionship', since: 'Jun 2026', phone: '(217) 555-0324', address: '5 Mill Lane, Springfield, IL 62703', payer: 'Veterans benefits', language: 'English', preferences: 'Enjoys card games and talking about the navy.', access: 'Daughter leaves a key with the neighbour at no. 7.',
    people: [P('p10', 'Joan Brooks', 'Daughter', '(217) 555-0625', 'joan.brooks@example.com', true, true, 'Active')], history: [] },
]

// What the Director of Nursing is watching for each client
const HN = (day: number, time: string, by: string, type: HealthNote['type'], text: string): HealthNote => ({ by, at: stampFor(day, time), date: addDays(day), type, text })
const HEALTH: Record<string, { risk: Client['risk']; health: HealthNote[] }> = {
  c1: { risk: { level: 'High', why: 'Slipped in the bathroom this week (INC-208). Walks with a stick. Lives alone.', by: 'Patricia Reyes', date: addDays(-1) },
    health: [HN(-1, '15:00', 'Patricia Reyes', 'Call with family', 'Spoke to Susan (daughter). No pain today. GP visit booked for Friday.'), HN(-40, '11:00', 'Patricia Reyes', 'Nurse home visit', 'Skin on heels fine. Walking steady with stick.')] },
  c5: { risk: { level: 'High', why: 'In hospital since early November after a chest infection. Care on hold.', by: 'Patricia Reyes', date: addDays(-16) },
    health: [HN(-16, '10:00', 'Aisha Rahman', 'Hospital stay', 'Admitted to St John’s with a chest infection. Visits on hold.')] },
  c9: { risk: { level: 'High', why: 'Unexplained bruise reported today (INC-209). Memory getting worse.', by: 'Patricia Reyes', date: addDays(0) },
    health: [HN(-20, '09:30', 'Michael Brooks', 'Change in health', 'Family say Edith is more forgetful. Asked GP for a memory check.')] },
  c6: { risk: { level: 'Medium', why: 'Three medicines a day. Pill box ran out this week (INC-207).', by: 'Michael Brooks', date: addDays(-2) },
    health: [HN(-2, '16:00', 'Michael Brooks', 'Change in health', 'Missed one day of tablets. Pharmacy now delivers weekly.')] },
  c13: { risk: { level: 'Medium', why: 'Hip operation 3 weeks ago. Walks with a frame.', by: 'Michael Brooks', date: addDays(-6) },
    health: [HN(-6, '14:00', 'Michael Brooks', 'Nurse home visit', 'Home assessment done. Wound healed. Physio twice a week.')] },
  c12: { risk: { level: 'Low', why: 'Stable. Enjoys his walks.', by: 'Michael Brooks', date: addDays(-60) }, health: [] },
  c2: { risk: { level: 'Low', why: 'Stable.', by: 'Michael Brooks', date: addDays(-90) }, health: [] },
  c3: { risk: { level: 'Medium', why: 'Diabetes — caregiver watches for low sugar signs.', by: 'Laura Chen', date: addDays(-30) },
    health: [HN(-30, '12:00', 'Laura Chen', 'Nurse home visit', 'Sugar levels steady. Feet checked, all fine.')] },
  c14: { risk: { level: 'Low', why: 'Stable. Lonely — companion visits help.', by: 'Laura Chen', date: addDays(-45) }, health: [] },
}
clients.forEach(c => { const h = HEALTH[c.id]; c.health = h?.health ?? []; if (h) c.risk = h.risk })

export const carePlans: CarePlan[] = [
  { id: 'cp1', clientId: 'c1', version: 2, status: 'Approved', services: ['Personal care', 'Medication reminders'], tasks: ['Help with bathing', 'Help getting dressed', 'Medication reminder', 'Prepare a meal'], instructions: 'Shower seat in the bathroom. Check skin on heels for redness. Medicines are in the blue box on the kitchen table.', goals: 'Stay safe and independent at home.', hoursPerWeek: 14, reviewDate: addDays(-3), createdBy: 'Aisha Rahman', createdDate: addDays(-185), submittedDate: addDays(-184), approvedBy: 'Michael Brooks', approvedDate: addDays(-183), effectiveDate: addDays(-183), comments: [] },
  { id: 'cp1b', clientId: 'c1', version: 3, status: 'Awaiting review', services: ['Personal care', 'Medication reminders'], tasks: ['Help with bathing', 'Help getting dressed', 'Medication reminder', 'Prepare a meal', 'Walk or gentle exercise'], instructions: 'Shower seat in the bathroom. Check skin on heels for redness. Medicines are in the blue box on the kitchen table. Use the new grab rail by the shower — stay with Margaret while she steps out.', goals: 'Stay safe and independent at home. Walk to the end of the street with help by spring.', hoursPerWeek: 16, reviewDate: addDays(180), createdBy: 'Aisha Rahman', createdDate: addDays(-1), submittedDate: addDays(0), comments: [{ by: 'Aisha Rahman', at: stampFor(0, '08:15'), text: 'Updated after her slip in the bathroom (INC-208). Added a short walk and 2 more hours a week — Susan (daughter) agrees.' }] },
  { id: 'cp1a', clientId: 'c1', version: 1, status: 'Superseded', services: ['Personal care'], tasks: ['Help with bathing', 'Help getting dressed'], instructions: 'Shower seat in the bathroom.', goals: 'Stay safe at home.', hoursPerWeek: 10, reviewDate: addDays(-185), createdBy: 'Aisha Rahman', createdDate: addDays(-370), approvedBy: 'Michael Brooks', approvedDate: addDays(-368), effectiveDate: addDays(-368), comments: [] },
  { id: 'cp2', clientId: 'c2', version: 1, status: 'Approved', services: ['Companionship'], tasks: ['Company and conversation', 'Walk or gentle exercise'], instructions: 'Short walk to the park if the weather is fine.', goals: 'Less lonely; keep active.', hoursPerWeek: 6, reviewDate: addDays(-5), createdBy: 'Aisha Rahman', createdDate: addDays(-300), approvedBy: 'Michael Brooks', approvedDate: addDays(-298), effectiveDate: addDays(-298), comments: [] },
  { id: 'cp5', clientId: 'c5', version: 1, status: 'Approved', services: ['Personal care'], tasks: ['Help with bathing', 'Help getting dressed'], instructions: '', goals: '', hoursPerWeek: 10, reviewDate: addDays(30), createdBy: 'Aisha Rahman', createdDate: addDays(-360), approvedBy: 'Michael Brooks', approvedDate: addDays(-358), effectiveDate: addDays(-358), comments: [] },
  { id: 'cp6', clientId: 'c6', version: 1, status: 'Approved', services: ['Medication reminders'], tasks: ['Medication reminder'], instructions: 'Three afternoon medicines in the pill box. Remind him to drink water.', goals: 'Never miss afternoon medicines.', hoursPerWeek: 7, reviewDate: addDays(120), createdBy: 'Aisha Rahman', createdDate: addDays(-50), approvedBy: 'Michael Brooks', approvedDate: addDays(-49), effectiveDate: addDays(-49), comments: [] },
  { id: 'cp9', clientId: 'c9', version: 1, status: 'Approved', services: ['Personal care'], tasks: ['Help getting dressed', 'Prepare a meal'], instructions: 'Porridge for breakfast.', goals: '', hoursPerWeek: 7.5, reviewDate: addDays(40), createdBy: 'Aisha Rahman', createdDate: addDays(-180), approvedBy: 'Michael Brooks', approvedDate: addDays(-178), effectiveDate: addDays(-178), comments: [] },
  { id: 'cp9b', clientId: 'c9', version: 2, status: 'Changes requested', services: ['Personal care', 'Homemaking'], tasks: ['Help getting dressed', 'Prepare a meal', 'Laundry'], instructions: 'Porridge for breakfast. Laundry on Fridays.', goals: '', hoursPerWeek: 10, reviewDate: addDays(180), createdBy: 'Aisha Rahman', createdDate: addDays(-4), submittedDate: addDays(-4), comments: [{ by: 'Michael Brooks', at: `${addDays(-2)}`, text: 'Please add the goals and say who does the laundry if Edith is unwell. Then send it back to me.' }] },
  { id: 'cp12', clientId: 'c12', version: 1, status: 'Approved', services: ['Personal care'], tasks: ['Help with bathing', 'Help getting dressed', 'Walk or gentle exercise'], instructions: 'Uses a walking frame indoors.', goals: '', hoursPerWeek: 15, reviewDate: addDays(25), createdBy: 'Sara Kim', createdDate: addDays(-330), approvedBy: 'Michael Brooks', approvedDate: addDays(-328), effectiveDate: addDays(-328), comments: [] },
  { id: 'cp13', clientId: 'c13', version: 1, status: 'Awaiting review', services: ['Personal care', 'Homemaking'], tasks: ['Help with bathing', 'Help getting dressed', 'Light housekeeping', 'Laundry'], instructions: 'Walks with a frame — keep the hallway clear. Ground-floor flat.', goals: 'Get back to washing and dressing on her own as her hip heals.', hoursPerWeek: 10, reviewDate: addDays(90), createdBy: 'Aisha Rahman', createdDate: addDays(-2), submittedDate: addDays(-1), comments: [{ by: 'Aisha Rahman', at: stampFor(-1, '16:40'), text: 'First plan, made from the hospital assessment. Start date is in 4 days.' }] },
  { id: 'cp3', clientId: 'c3', version: 1, status: 'Approved', services: ['Homemaking', 'Personal care'], tasks: ['Light housekeeping', 'Laundry', 'Help getting dressed'], instructions: 'Radio on while you work. Laundry on Mondays.', goals: 'Keep the home clean and safe.', hoursPerWeek: 6, reviewDate: addDays(70), createdBy: 'Daniel Reed', createdDate: addDays(-460), approvedBy: 'Laura Chen', approvedDate: addDays(-458), effectiveDate: addDays(-458), comments: [] },
  { id: 'cp14', clientId: 'c14', version: 1, status: 'Approved', services: ['Companionship'], tasks: ['Company and conversation', 'Walk or gentle exercise'], instructions: 'Loves a game of cards.', goals: 'Less lonely.', hoursPerWeek: 4, reviewDate: addDays(30), createdBy: 'Daniel Reed', createdDate: addDays(-160), approvedBy: 'Laura Chen', approvedDate: addDays(-158), effectiveDate: addDays(-158), comments: [] },
]

export const documents: ClientDoc[] = [
  { id: 'd1', clientId: 'c1', name: 'Service agreement (signed).pdf', category: 'Service agreement', uploadedBy: 'Aisha Rahman', date: addDays(-370), status: 'Checked', checkedBy: 'Michael Brooks', checkedDate: addDays(-368) },
  { id: 'd2', clientId: 'c1', name: 'Lifeway insurance letter.pdf', category: 'Insurance or funding letter', uploadedBy: 'Aisha Rahman', date: addDays(-200), expiry: addDays(20), status: 'Checked' },
  { id: 'd3', clientId: 'c2', name: 'Service agreement.pdf', category: 'Service agreement', uploadedBy: 'Aisha Rahman', date: addDays(-300), status: 'Checked' },
  { id: 'd4', clientId: 'c6', name: 'Service agreement.pdf', category: 'Service agreement', uploadedBy: 'Aisha Rahman', date: addDays(-50), status: 'Checked' },
  { id: 'd5', clientId: 'c9', name: 'Service agreement.pdf', category: 'Service agreement', uploadedBy: 'Aisha Rahman', date: addDays(-180), status: 'Checked' },
  { id: 'd6', clientId: 'c12', name: 'Service agreement.pdf', category: 'Service agreement', uploadedBy: 'Sara Kim', date: addDays(-330), status: 'Checked' },
  { id: 'd7', clientId: 'c13', name: 'Hospital discharge letter.pdf', category: 'Hospital discharge letter', uploadedBy: 'Aisha Rahman', date: addDays(-3), status: 'Not checked' },
  { id: 'd8', clientId: 'c5', name: 'Service agreement.pdf', category: 'Service agreement', uploadedBy: 'Aisha Rahman', date: addDays(-360), status: 'Checked' },
  { id: 'd9', clientId: 'c13', name: 'Service agreement (signed).pdf', category: 'Service agreement', uploadedBy: 'Aisha Rahman', date: addDays(-3), status: 'Not checked' },
  { id: 'd10', clientId: 'c3', name: 'Medicaid waiver letter.pdf', category: 'Insurance or funding letter', uploadedBy: 'Daniel Reed', date: addDays(-400), expiry: addDays(-2), status: 'Checked', checkedBy: 'Laura Chen', checkedDate: addDays(-398) },
  { id: 'd11', clientId: 'c12', name: 'Consent form.pdf', category: 'Consent form', uploadedBy: 'Sara Kim', date: addDays(-1), status: 'Not checked' },
  { id: 'd12', clientId: 'c3', name: 'Service agreement.pdf', category: 'Service agreement', uploadedBy: 'Daniel Reed', date: addDays(-460), status: 'Checked' },
  { id: 'd13', clientId: 'c14', name: 'Service agreement.pdf', category: 'Service agreement', uploadedBy: 'Daniel Reed', date: addDays(-160), status: 'Checked' },
  { id: 'd14', clientId: 'c14', name: 'Photo ID.jpg', category: 'Photo ID', uploadedBy: 'Daniel Reed', date: addDays(-4), status: 'Not checked' },
]

// Weekly visit pattern per client: [weekdays (0=Sun), start, end, service, regular caregiver]
const PATTERN: Record<string, [number[], string, string, string, string]> = {
  c1: [[1, 2, 3, 4, 5, 6, 0], '09:00', '11:00', 'Personal care', 'g1'],
  c2: [[1, 3, 5], '11:00', '13:00', 'Companionship', 'g3'],
  c6: [[1, 2, 3, 4, 5, 6, 0], '15:00', '16:00', 'Medication reminders', 'g3'],
  c9: [[1, 2, 3, 4, 5], '07:00', '08:30', 'Personal care', 'g9'],
  c12: [[2, 3, 4, 5, 6], '09:30', '12:30', 'Personal care', 'g10'],
  c3: [[1, 3, 5], '08:00', '10:00', 'Homemaking', 'g5'],
  c14: [[2, 4, 6], '14:00', '16:00', 'Companionship', 'g6'],
}
// Visits that still need a caregiver: [dayOffset, clientId]
const OPEN: [number, string][] = [[1, 'c6'], [1, 'c12'], [2, 'c2'], [4, 'c9']]
// Past visits cancelled because nobody was free
const MISSED: [number, string][] = [[-4, 'c12'], [-2, 'c2']]

const H = (day: number, time: string, by: string, text: string): Note => ({ by, at: stampFor(day, time), text })
const HOME = 'At the client’s home'
/** Finished visits from this many days ago (or newer) are still waiting for the Care Supervisor. */
const REVIEW_DAYS = 5

function buildVisits(): Visit[] {
  const out: Visit[] = []
  const now = nowHM()
  let n = 4700
  // Find today's most recently started visit: it shows as "late, not checked in"
  const todayStarts = Object.entries(PATTERN).filter(([cid, [days]]) => cid !== 'c3' && cid !== 'c14' && days.includes(new Date().getDay()) && clients.find(c => c.id === cid)?.status === 'Active').map(([cid, p]) => ({ cid, start: p[1] })).filter(x => x.start <= shift(now, -rules.lateArrivalMins)).sort((a, b) => b.start.localeCompare(a.start))
  const lateCid = todayStarts[0]?.cid
  for (let day = -10; day <= 13; day++) {
    const d = new Date(); d.setDate(d.getDate() + day)
    for (const [cid, [days, start, end, service, cg]] of Object.entries(PATTERN)) {
      if (!days.includes(d.getDay())) continue
      const c = clients.find(x => x.id === cid)!
      if (c.status !== 'Active') continue
      n += 1
      const open = OPEN.some(([o, x]) => o === day && x === cid)
      const missed = MISSED.some(([o, x]) => o === day && x === cid)
      const plan = carePlans.find(p => p.clientId === cid && p.status === 'Approved')
      const v: Visit = { id: 'v' + n, clientId: cid, caregiverId: open || missed ? null : cg, date: iso(d), start, end, branch: c.branch, service, status: 'Scheduled', series: 's-' + cid }
      const finish = (inAt: string, outAt: string) => {
        v.status = 'Completed'; v.checkIn = inAt; v.checkOut = outAt; v.place = HOME; v.tasksDone = [...(plan?.tasks ?? [])]
        if (day >= -REVIEW_DAYS) v.approval = 'To review'
        else { v.approval = 'Approved'; v.approvedBy = c.branch === 'south' ? 'Laura Chen' : 'Michael Brooks'; v.approvedAt = stampFor(day + 1, '10:00'); if (day <= -7 && !['c1', 'c9', 'c12'].includes(cid)) v.billing = 'Invoiced' }
      }
      if (day < 0) { if (missed) { v.status = 'Cancelled'; v.cancelReason = 'No caregiver available' } else finish(shift(start, 2), shift(end, 1)) }
      else if (day === 0) {
        if (cid === lateCid) { /* late: not checked in yet */ }
        else if (end <= now) finish(shift(start, 3), shift(end, 0))
        else if (start <= now) { v.status = 'In progress'; v.checkIn = shift(start, 4); v.place = HOME }
      }
      if (open) v.status = 'Unassigned'
      out.push(v)
    }
  }
  // Things the caregiver app picked up, for the Care Supervisor to look at
  const latest = (cid: string) => out.filter(v => v.clientId === cid && v.approval === 'To review' && v.date < TODAY).sort((a, b) => b.date.localeCompare(a.date))[0]
  const a = latest('c1'); if (a) { a.checkIn = shift(a.start, 42); a.cgNote = 'My bus was late. I called Margaret to say. Stayed until the end.' }
  const b = latest('c6'); if (b) { b.checkOut = undefined; b.cgNote = undefined }
  const c = latest('c9'); if (c) { c.checkOut = shift(c.end, -30); c.tasksDone = c.tasksDone?.filter(t => t !== 'Prepare a meal'); c.tasksNote = 'Edith had already eaten breakfast.'; c.cgNote = 'Left early — Edith’s son arrived and took her out.' }
  const d2 = latest('c2'); if (d2) { d2.place = '0.6 miles from the home'; d2.cgNote = 'No phone signal at the door, so I checked in from the car park on the main road.' }
  const e = latest('c3'); if (e) { e.approval = 'Sent back'; e.checkOut = '17:10'; e.returned = { reason: 'Check-out at 17:10 looks wrong — the visit ends at 10:00. Please ask Sofia what time she really left and correct it.', by: 'Laura Chen', at: stampFor(-1, '11:20') } }
  const f = latest('c12'); if (f) f.cgNote = 'Samuel walked to the corner shop with me. Good day.'
  // Daniel Osei's first-aid certificate expired after he was booked: flag his future visit for review
  const flagged = out.find(v => v.clientId === 'c2' && v.date > TODAY && v.status === 'Scheduled')
  if (flagged) { flagged.caregiverId = 'g2'; flagged.review = 'Daniel Osei is no longer ready to work (first-aid certificate expired)' }
  return out
}
export const visits: Visit[] = buildVisits()

/* ---- Caregiver checks owned by the Care Supervisor (skills checks, spot checks) ---- */
export const checks: CgCheck[] = [
  { id: 'k1', caregiverId: 'g10', name: 'Personal care skills check', why: 'Watched doing personal care before working alone.', blocking: false, status: 'Waiting for check', due: addDays(2), evidence: 'Skills check form.pdf — uploaded by Lena Ortiz (HR)' },
  { id: 'k2', caregiverId: 'g1', name: 'Spot check visit', why: 'A supervisor visits during a shift every 6 months.', blocking: false, status: 'To do', due: addDays(5) },
  { id: 'k3', caregiverId: 'g9', name: 'Moving and handling skills check', why: 'Safe lifting and using a frame or hoist. Yearly.', blocking: false, status: 'Expired', expiry: addDays(-3), checkedBy: 'Michael Brooks', checkedDate: addDays(-368) },
  { id: 'k4', caregiverId: 'g11', name: 'Companionship induction sign-off', why: 'First month reviewed with the supervisor.', blocking: false, status: 'Waiting for check', due: addDays(-1), evidence: 'Induction notes.pdf — uploaded by Lena Ortiz (HR)' },
  { id: 'k5', caregiverId: 'g3', name: 'Medication reminders skills check', why: 'Shows they prompt but never give medicines. Yearly.', blocking: false, status: 'Checked', expiry: addDays(200), checkedBy: 'Michael Brooks', checkedDate: addDays(-165) },
  { id: 'k6', caregiverId: 'g1', name: 'Personal care skills check', why: 'Watched doing personal care before working alone.', blocking: false, status: 'Checked', expiry: addDays(25), checkedBy: 'Michael Brooks', checkedDate: addDays(-340) },
  { id: 'k7', caregiverId: 'g5', name: 'Spot check visit', why: 'A supervisor visits during a shift every 6 months.', blocking: false, status: 'Checked', expiry: addDays(120), checkedBy: 'Laura Chen', checkedDate: addDays(-60) },
  { id: 'k8', caregiverId: 'g6', name: 'Moving and handling skills check', why: 'Only needed for staff who do personal care.', blocking: false, status: 'Not needed', checkedBy: 'Laura Chen', checkedDate: addDays(-30), reason: 'James is a companion only and does no lifting.' },
]

const A = (id: string, text: string, who: string, due: number, done = false): IncidentAction => ({ id, text, who, due: addDays(due), done, doneAt: done ? stampFor(due, '12:00') : undefined })
export const incidents: Incident[] = [
  { id: 'INC-209', title: 'Bruise noticed on client’s arm', category: 'Safeguarding concern', severity: 'High', client: 'Edith Morris', caregiver: 'Rosa Diaz', reportedBy: 'Rosa Diaz', date: addDays(0), owner: 'Michael Brooks', due: addDays(1), status: 'Reported', branch: 'north', sensitive: true, notes: [H(0, '08:40', 'Rosa Diaz', 'Large bruise on Edith’s left arm while helping her dress. Edith said she doesn’t remember how it happened. Photo not taken.')], findings: '', actions: [] },
  { id: 'INC-208', title: 'Client slipped in bathroom', category: 'Fall', severity: 'High', client: 'Margaret Hale', caregiver: 'Grace Mensah', reportedBy: 'Grace Mensah', date: addDays(-1), owner: 'Michael Brooks', due: addDays(1), status: 'Under review', branch: 'north', sensitive: false,
    notes: [H(-1, '10:12', 'Grace Mensah', 'Client slipped stepping out of the shower. No visible injury. Family told.'), H(-1, '14:30', 'Michael Brooks', 'Called Susan (daughter). She agreed to a grab rail.')],
    findings: 'Bathroom floor was wet and there is nothing to hold when stepping out of the shower.', actions: [A('a1', 'Fit a grab rail by the shower', 'Susan Hale (family)', 1), A('a2', 'Update care plan: stay with Margaret when she steps out', 'Aisha Rahman', 1, true)] },
  { id: 'INC-207', title: 'Medication box was empty', category: 'Medication concern', severity: 'Medium', client: 'Harold Jenkins', caregiver: 'Maria Lopez', reportedBy: 'Maria Lopez', date: addDays(-2), owner: 'Michael Brooks', due: addDays(2), status: 'Action required', branch: 'north', sensitive: false,
    notes: [H(-2, '15:20', 'Maria Lopez', 'Weekly pill box empty on arrival. Called his wife.'), H(-1, '09:00', 'Michael Brooks', 'Pharmacy confirmed the weekly delivery was missed.')],
    findings: 'The pharmacy missed the weekly delivery. Nobody noticed until the visit.', actions: [A('a3', 'Ask the pharmacy to set up a repeat delivery', 'Aisha Rahman', -1, true), A('a4', 'Caregiver to check the pill box at every visit and report if low', 'Maria Lopez', 2)] },
  { id: 'INC-206', title: 'Visit missed — caregiver unwell', category: 'Missed visit', severity: 'Medium', client: 'Walter Brooks', reportedBy: 'Daniel Reed', date: addDays(-3), owner: 'Laura Chen', due: addDays(0), status: 'Reported', branch: 'south', sensitive: false,
    notes: [H(-3, '15:30', 'Daniel Reed', 'James Carter called in sick at 13:30. No one was free to cover the 14:00 visit. Joan (daughter) went round instead.')], findings: '', actions: [] },
  { id: 'INC-204', title: 'Visit missed — no caregiver', category: 'Missed visit', severity: 'Medium', client: 'Samuel Grant', reportedBy: 'Sara Kim', date: addDays(-4), owner: 'Michael Brooks', due: addDays(-1), status: 'Resolved', branch: 'north', sensitive: false,
    notes: [H(-4, '10:00', 'Sara Kim', 'No cover found for the morning visit. Wife helped instead.'), H(-2, '11:00', 'Michael Brooks', 'Agreed a back-up caregiver for Tuesdays.')],
    findings: 'Ben Okafor was on leave and no back-up was set up for Tuesdays.', actions: [A('a5', 'Set up Maria Lopez as back-up on Tuesdays', 'Sara Kim', -2, true)], resolution: 'Back-up caregiver now in place for Tuesdays. Family happy.' },
  { id: 'INC-198', title: 'Complaint about late arrival', category: 'Complaint', severity: 'Low', client: 'Robert King', caregiver: 'Maria Lopez', reportedBy: 'Aisha Rahman', date: addDays(-20), owner: 'Michael Brooks', due: addDays(-14), status: 'Closed', branch: 'north', sensitive: false,
    notes: [H(-20, '13:30', 'Aisha Rahman', 'Mark King (son) said the caregiver came 25 minutes late twice this week.')],
    findings: 'Maria’s earlier visit ran over twice.', actions: [A('a6', 'Move Robert’s visit 15 minutes later on Mondays', 'Aisha Rahman', -16, true)], resolution: 'Visit time moved. Mark King happy with the change.', closingNote: 'No more late visits in two weeks. Closed.' },
]

export const audit: AuditEntry[] = []

export const inbox: Inbox[] = [
  { id: 'n1', title: 'High severity incident: Edith Morris', body: 'Private · bruise noticed · owner Michael Brooks', at: '30 min ago', read: false, link: '/incidents/INC-209', tone: 'danger' },
  { id: 'n2', title: 'High severity incident: Margaret Hale', body: 'Fall in the bathroom · owner Michael Brooks', at: 'Yesterday', read: false, link: '/incidents/INC-208', tone: 'danger' },
  { id: 'n3', title: 'Training attendance not recorded', body: 'Spotting and reporting abuse · 3 days ago', at: 'Yesterday', read: false, link: '/staff?tab=training', tone: 'warning' },
  { id: 'n4', title: 'Staff reviews overdue', body: 'Daniel Osei and Rosa Diaz', at: '2 days ago', read: true, link: '/staff', tone: 'warning' },
]

/* ---- Staff reviews: every caregiver and Care Supervisor, once a year ---- */
const R = (id: string, personId: string, due: number, last?: [number, string, ReviewOutcome, string]): StaffReview => ({ id, personId, due: addDays(due), history: last ? [{ date: addDays(last[0]), by: last[1], outcome: last[2], note: last[3] }] : [] })
export const reviews: StaffReview[] = [
  R('r1', 'g1', 40, [-325, 'Patricia Reyes', 'Above standards', 'Clients ask for Grace by name. Ready to mentor new staff.']),
  R('r2', 'g2', -6, [-371, 'Patricia Reyes', 'Meets standards', 'Good with clients. Keep certificates up to date.']),
  R('r3', 'g3', 120),
  R('r4', 'g7', 10),
  R('r5', 'g9', -2, [-367, 'Michael Brooks', 'Meets standards', 'Reliable early starts.']),
  R('r6', 'g10', 75, [-290, 'Michael Brooks', 'Needs to improve', 'Late twice in a month. Agreed a plan to fix travel times.']),
  R('r7', 'g11', 200),
  R('r8', 'g5', 30, [-335, 'Laura Chen', 'Meets standards', 'Clients happy. Tidy and careful.']),
  R('r9', 'g6', 150),
  R('r10', 'u2', 18, [-347, 'Patricia Reyes', 'Meets standards', 'Approvals on time. Work on care plan review dates.']),
  R('r11', 'u9', 95, [-270, 'Patricia Reyes', 'Above standards', 'Strong incident follow-up.']),
]

/* ---- In-service training sessions ---- */
const ALL_CG = ['g1', 'g2', 'g3', 'g7', 'g9', 'g10', 'g11', 'g5', 'g6']
export const trainings: Training[] = [
  { id: 't1', title: 'Annual safety refresher (infection control, moving and handling)', date: addDays(5), time: '10:00', place: 'North Branch office', trainer: 'Patricia Reyes', invited: ['g2', 'g9', 'g10', 'g11'], attended: null, added: addDays(-10) },
  { id: 't2', title: 'Spotting and reporting abuse', date: addDays(-3), time: '14:00', place: 'Online', trainer: 'Patricia Reyes', invited: ['g1', 'g3', 'g9', 'g5', 'g6'], attended: null, added: addDays(-20) },
  { id: 't3', title: 'Medication reminders — what you can and can’t do', date: addDays(-30), time: '10:00', place: 'South Branch office', trainer: 'Laura Chen', invited: ['g3', 'g9', 'g5'], attended: ['g3', 'g5'], note: 'Rosa was on a visit — to join the next session.', added: addDays(-45) },
  { id: 't4', title: 'Dementia care basics', date: addDays(-60), time: '13:00', place: 'North Branch office', trainer: 'Patricia Reyes', invited: ALL_CG, attended: ['g1', 'g2', 'g3', 'g9', 'g10', 'g5', 'g6'], added: addDays(-80) },
]

// Older incidents, so quality and risk shows a 90-day picture
incidents.push(
  { id: 'INC-192', title: 'Client fell getting out of bed', category: 'Fall', severity: 'Medium', client: 'Edith Morris', caregiver: 'Rosa Diaz', reportedBy: 'Rosa Diaz', date: addDays(-38), owner: 'Michael Brooks', due: addDays(-31), status: 'Closed', branch: 'north', sensitive: false,
    notes: [H(-38, '07:40', 'Rosa Diaz', 'Edith slid to the floor getting out of bed. No injury.')], findings: 'Bed too high.', actions: [A('a7', 'Lower the bed', 'Paul Morris (family)', -34, true)], resolution: 'Bed lowered.', closingNote: 'No more falls in 4 weeks.' },
  { id: 'INC-187', title: 'Wrong day for tablets', category: 'Medication concern', severity: 'Low', client: 'Harold Jenkins', caregiver: 'Maria Lopez', reportedBy: 'Maria Lopez', date: addDays(-55), owner: 'Michael Brooks', due: addDays(-48), status: 'Closed', branch: 'north', sensitive: false,
    notes: [H(-55, '15:30', 'Maria Lopez', 'Harold took Tuesday’s tablets on Monday.')], findings: 'Pill box days were hard to read.', actions: [A('a8', 'Get a large-print pill box', 'Aisha Rahman', -50, true)], resolution: 'Large-print pill box in use.', closingNote: 'Closed.' },
  { id: 'INC-181', title: 'Caregiver arrived 40 minutes late', category: 'Complaint', severity: 'Low', client: 'Evelyn Price', caregiver: 'Sofia Novak', reportedBy: 'Daniel Reed', date: addDays(-72), owner: 'Laura Chen', due: addDays(-65), status: 'Closed', branch: 'south', sensitive: false,
    notes: [H(-72, '11:00', 'Daniel Reed', 'Carl Price (nephew) complained about a late visit.')], findings: 'Road closure.', actions: [], resolution: 'Apologised to the family.', closingNote: 'Closed.' },
  { id: 'INC-176', title: 'Client fell in the garden', category: 'Fall', severity: 'Medium', client: 'Walter Brooks', caregiver: 'James Carter', reportedBy: 'James Carter', date: addDays(-84), owner: 'Laura Chen', due: addDays(-77), status: 'Closed', branch: 'south', sensitive: false,
    notes: [H(-84, '15:00', 'James Carter', 'Walter tripped on the garden step. Grazed hand.')], findings: 'Loose step.', actions: [A('a9', 'Fix the garden step', 'Joan Brooks (family)', -80, true)], resolution: 'Step fixed.', closingNote: 'Closed.' },
)
