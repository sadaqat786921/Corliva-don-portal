import { useNavigate } from 'react-router-dom'
import {
  TriangleAlert, CheckCircle2, ShieldAlert, Lock, HeartPulse, GraduationCap, UserCheck, ClipboardList, ChevronRight,
} from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { TODAY, addDays } from '../data/seed'
import { coverQueue } from '../data/schedule'
import { plansFor, reviewOverdue } from '../data/clients'
import { attendanceMissing, checkInDue, lastHealth, reviewState, staffPeople, supervisorOf } from '../data/nursing'
import { Button, CardHead, Chip, ChipTone, PageHead, StatTile } from '../components/ui'
import { sevTone } from './Incidents'
import { riskTone } from './ClientDetail'

const short = (d: string) => d === TODAY ? 'today' : fmtDate(d, { day: 'numeric', month: 'short' })
const daysAgo = (d: string) => Math.round((new Date(TODAY).getTime() - new Date(d).getTime()) / 86400000)

export default function Dashboard() {
  const s = useStore()
  const nav = useNavigate()
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const first = s.me.name.split(' ')[0]

  const clients = s.clients.filter(c => s.inBranch(c.branch) && c.status !== 'Discharged')
  const highRisk = clients.filter(c => c.risk?.level === 'High')
  const updateDue = clients.filter(checkInDue)
  const openInc = s.incidents.filter(i => s.inBranch(i.branch) && !['Resolved', 'Closed'].includes(i.status))
  const highInc = openInc.filter(i => i.severity === 'High')
  const pastTarget = openInc.filter(i => i.due < TODAY)
  const lateActions = openInc.flatMap(i => i.actions.filter(a => !a.done && a.due < TODAY).map(a => ({ i, a })))
  const staff = staffPeople(s.caregivers, s.users).filter(p => s.inBranch(p.branch))
  const overdueReviews = s.reviews.filter(r => reviewState(r) === 'Overdue' && staff.some(p => p.id === r.personId))
  const toRecord = s.trainings.filter(attendanceMissing)
  const soon = s.trainings.filter(t => t.date >= TODAY && t.date <= addDays(7))
  const decisions = coverQueue(s.visits, s.caregivers, s.inBranch).filter(i => (i.kind === 'Caregiver not ready' || i.kind === 'Needs review') && !i.visit.override && i.visit.date <= addDays(7))
  const sups = s.users.filter(u => u.role === 'Care Supervisor' && u.status === 'Active' && s.inBranch(u.branch)).map(u => {
    const waiting = s.visits.filter(v => v.branch === u.branch && v.approval === 'To review')
    const oldest = waiting.map(v => v.date).sort()[0]
    const plans = s.clients.filter(c => c.branch === u.branch).map(c => plansFor(c.id, s.carePlans))
    return { u, visits: waiting.length, oldest, plans: plans.filter(p => p.working?.status === 'Awaiting review').length, reviews: plans.filter(p => !p.working && reviewOverdue(p.current)).length, late: s.incidents.filter(i => i.owner === u.name && !['Resolved', 'Closed'].includes(i.status) && i.due < TODAY).length }
  })
  const behind = sups.filter(x => (x.oldest && daysAgo(x.oldest) > 5) || x.late || x.reviews)

  type Q = { icon: typeof TriangleAlert; tone: ChipTone; title: string; sub: string; chip: string; action: string; to: string }
  const queue: Q[] = [
    ...highInc.map(i => ({ icon: i.sensitive ? Lock : TriangleAlert, tone: 'danger' as const, title: `High severity incident: ${i.title}`, sub: `${i.client} · ${i.status.toLowerCase()} · owner ${i.owner === s.me.name ? 'you' : i.owner}${i.sensitive ? ' · private' : ''}`, chip: 'Sent up to you', action: 'Open', to: `/incidents/${i.id}?from=/` })),
    ...updateDue.map(c => ({ icon: HeartPulse, tone: 'warning' as const, title: `Health update due: ${c.name}`, sub: `High risk · ${lastHealth(c) ? `last update ${short(lastHealth(c)!.date)}` : 'no updates yet'}`, chip: 'Every 7 days', action: 'Add update', to: `/clients/${c.id}?tab=health` })),
    ...pastTarget.filter(i => i.severity !== 'High').map(i => ({ icon: TriangleAlert, tone: 'danger' as const, title: `Incident past its target date: ${i.title}`, sub: `${i.client} · owner ${i.owner} · target was ${short(i.due)}`, chip: i.status, action: 'Open', to: `/incidents/${i.id}?from=/` })),
    ...decisions.map(d => ({ icon: ShieldAlert, tone: 'danger' as const, title: `Visit needs a decision: ${s.client(d.visit.clientId)?.name}`, sub: `${d.visit.date === TODAY ? 'Today' : fmtDate(d.visit.date)} ${d.visit.start}–${d.visit.end} · ${d.detail}`, chip: `${supervisorOf(d.visit.branch, s.users)?.name ?? 'Supervisor'} or you`, action: 'Decide', to: `/visits/${d.visit.id}?from=/` })),
    ...toRecord.map(t => ({ icon: GraduationCap, tone: 'warning' as const, title: `Record who came: ${t.title}`, sub: `${short(t.date)} · ${t.invited.length} invited`, chip: 'Training', action: 'Record', to: `/training/${t.id}` })),
    ...overdueReviews.map(r => { const p = staff.find(x => x.id === r.personId)!; return { icon: ClipboardList, tone: 'warning' as const, title: `Staff review overdue: ${p.name}`, sub: `${p.role} · was due ${short(r.due)}`, chip: 'Staff review', action: 'Open', to: '/staff' } }),
    ...behind.map(x => ({ icon: UserCheck, tone: 'warning' as const, title: `${x.u.name} is falling behind`, sub: [x.oldest && daysAgo(x.oldest) > 5 ? `visits waiting ${daysAgo(x.oldest)} days` : '', x.late ? `${x.late} incident${x.late > 1 ? 's' : ''} past target` : '', x.reviews ? `${x.reviews} care plan review${x.reviews > 1 ? 's' : ''} overdue` : ''].filter(Boolean).join(' · '), chip: s.branchName(x.u.branch), action: 'Open', to: '/supervisors' })),
  ]

  return (
    <>
      <PageHead title="My work" crumb="My work" />
      <section className="hero">
        <div className="t-display" style={{ fontSize: 24 }}>{greet}, {first}</div>
        <div style={{ opacity: .92, marginTop: 4 }}>Care quality across {s.branchName(s.branch).toLowerCase() === 'all branches' ? 'the whole agency' : s.branchName(s.branch)}.</div>
        {highInc.length > 0 ? <button className="hero-note" onClick={() => nav(`/incidents/${highInc[0].id}?from=/`)}><TriangleAlert size={15} />{highInc.length} high severity incident{highInc.length > 1 ? 's' : ''} open.</button>
          : <span className="hero-note"><CheckCircle2 size={15} />No high severity incidents open.</span>}
        <img src="./images/corliva-symbol-light.svg" alt="" aria-hidden />
      </section>

      <div className="grid g-4">
        <StatTile icon={HeartPulse} tone="danger" label="High-risk clients" value={highRisk.length} foot={`${updateDue.length} need a health update`} onClick={() => nav('/health')} />
        <StatTile icon={TriangleAlert} tone="warning" label="Open incidents" value={openInc.length} foot={`${highInc.length} high severity · ${lateActions.length} late action${lateActions.length === 1 ? '' : 's'}`} onClick={() => nav('/incidents')} />
        <StatTile icon={UserCheck} tone="info" label="Care Supervisors" value={sups.length} foot={behind.length ? `${behind.length} falling behind` : 'All on track'} chip={behind.length ? { tone: 'warning', text: 'Check' } : { tone: 'success', text: 'On track' }} onClick={() => nav('/supervisors')} />
        <StatTile icon={GraduationCap} tone="success" label="Staff reviews and training" value={overdueReviews.length + toRecord.length} foot={`${overdueReviews.length} reviews overdue · ${toRecord.length} to record`} onClick={() => nav('/staff')} />
      </div>

      <div className="grid g-main-side" style={{ alignItems: 'start' }}>
        <div className="card">
          <CardHead title="Needs you now" sub="Most urgent first. Each item stays here until it’s sorted." />
          <div className="card-body">
            {queue.length === 0 ? <div className="row t-small" style={{ gap: 8 }}><CheckCircle2 size={16} color="var(--status-success)" />You’re all caught up.</div> : queue.map((q, i) => (
              <div key={i} className="list-row">
                <div className={`stat-icon tone-${q.tone}`} style={{ width: 34, height: 34 }}><q.icon size={16} /></div>
                <div className="grow"><div className="t-medium">{q.title}</div><div className="t-caption t-muted">{q.sub}</div></div>
                <Chip tone={q.tone}>{q.chip}</Chip>
                <Button size="sm" onClick={() => nav(q.to)}>{q.action}</Button>
              </div>))}
          </div>
        </div>
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <CardHead title="High-risk clients" action={<button className="link-btn" onClick={() => nav('/health')}>Clients’ health</button>} />
            <div className="card-body">{highRisk.length === 0 ? <div className="t-small t-muted">None.</div> : highRisk.map(c => (
              <button key={c.id} className="list-row clickable-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/clients/${c.id}?tab=health`)}>
                <div className="grow"><div className="t-small t-medium">{c.name}</div><div className="t-caption t-muted">{c.risk!.why}</div></div>
                <Chip tone={riskTone('High')}>High</Chip><ChevronRight size={16} color="var(--text-muted)" />
              </button>))}</div>
          </div>
          <div className="card">
            <CardHead title="Care Supervisors" action={<button className="link-btn" onClick={() => nav('/supervisors')}>Open</button>} />
            <div className="card-body">{sups.map(x => (
              <div key={x.u.id} className="list-row">
                <div className="grow"><div className="t-small t-medium">{x.u.name}</div><div className="t-caption t-muted">{s.branchName(x.u.branch)} · {x.visits} visits · {x.plans} care plans waiting</div></div>
                <Chip tone={behind.includes(x) ? 'warning' : 'success'}>{behind.includes(x) ? 'Falling behind' : 'On track'}</Chip>
              </div>))}</div>
          </div>
          <div className="card">
            <CardHead title="Training this week" action={<button className="link-btn" onClick={() => nav('/staff?tab=training')}>Training</button>} />
            <div className="card-body">{soon.length === 0 ? <div className="t-small t-muted">No sessions in the next 7 days.</div> : soon.map(t => (
              <button key={t.id} className="list-row clickable-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/training/${t.id}`)}>
                <GraduationCap size={15} color="var(--text-muted)" /><div className="grow"><div className="t-small t-medium">{t.title}</div><div className="t-caption t-muted">{short(t.date)} · {t.time} · {t.invited.length} invited</div></div>
              </button>))}</div>
          </div>
          <div className="card">
            <CardHead title="Open incidents by severity" action={<button className="link-btn" onClick={() => nav('/quality')}>Quality and risk</button>} />
            <div className="card-body col" style={{ gap: 8 }}>{(['High', 'Medium', 'Low'] as const).map(l => <div key={l} className="row between"><Chip tone={sevTone(l)}>{l}</Chip><b>{openInc.filter(i => i.severity === l).length}</b></div>)}</div>
          </div>
        </div>
      </div>
    </>
  )
}
