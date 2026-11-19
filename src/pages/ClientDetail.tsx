import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Phone, MapPin, CalendarDays, Search, KeyRound, Languages, Heart, History, FileText, ShieldCheck, ChevronRight, Mail, ClipboardList,
} from 'lucide-react'
import { useStore, fmtDate, stampNow } from '../data/store'
import { CarePlan, Client, TODAY } from '../data/seed'
import { planForVisit, plansFor, reviewOverdue } from '../data/clients'
import { serviceFlags } from '../data/review'
import { AlertBanner, Avatar, Button, CardHead, Chip, ChipTone, EmptyState, Field, Modal, Select, Tabs, Textarea } from '../components/ui'
import { DocCheckModal, docExpired, docTone, expiringSoon } from '../components/CheckActions'
import { HEALTH_TYPES, HealthNote, RiskLevel } from '../data/seed'
import { checkInDue, lastHealth } from '../data/nursing'
import { planLabel } from './Clients'

const stTone = (s: Client['status']): ChipTone => s === 'Active' ? 'success' : s === 'On hold' ? 'warning' : 'neutral'
const long = (d?: string) => d ? fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
export const riskTone = (l: RiskLevel): ChipTone => l === 'High' ? 'danger' : l === 'Medium' ? 'warning' : 'success'
export const planTone = (s: CarePlan['status']): ChipTone => s === 'Approved' ? 'success' : s === 'Changes requested' ? 'warning' : s === 'Awaiting review' ? 'info' : 'neutral'
type Tab = 'overview' | 'health' | 'plan' | 'documents' | 'visits'
const TABS: Tab[] = ['overview', 'health', 'plan', 'documents', 'visits']

export default function ClientDetail() {
  const { id } = useParams()
  const s = useStore()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (TABS.includes(params.get('tab') as Tab) ? params.get('tab') : 'overview') as Tab
  const setTab = (t: Tab) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true })
  const c = s.clients.find(x => x.id === id)
  if (!c || !s.inBranch(c.branch)) return <div className="card"><EmptyState icon={Search} tone="neutral" title="We can’t find this client" text="They may be in a branch you’ve filtered out. Go back to the client list." action={<Button onClick={() => nav('/clients')}>All clients</Button>} /></div>

  const p = plansFor(c.id, s.carePlans)
  const pl = planLabel(p.current, p.working)
  const docsToCheck = s.documents.filter(d => d.clientId === c.id && d.status === 'Not checked').length

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/clients" className="row t-small t-medium" style={{ gap: 6, marginBottom: 8 }}><ArrowLeft size={15} />All clients</Link>
          <div className="row wrap" style={{ gap: 10 }}>
            <Avatar name={c.name} size="lg" />
            <div>
              <div className="row wrap" style={{ gap: 10 }}><h1 className="t-h1">{c.name}</h1><Chip tone={stTone(c.status)}>{c.status}</Chip>{c.risk && <Chip tone={riskTone(c.risk.level)}>{c.risk.level} risk</Chip>}</div>
              <div className="t-small t-muted" style={{ marginTop: 2 }}>{s.branchName(c.branch)} · Coordinator: <b style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.coordinator}</b> · Client since {c.since}</div>
            </div>
          </div>
          <div className="crumbs"><Link to="/">Home</Link><span>/</span><Link to="/clients">Clients</Link><span>/</span><span>{c.name}</span></div>
        </div>
        <div className="actions">
          <Button variant="secondary" icon={CalendarDays} onClick={() => nav(`/schedule?client=${c.id}`)}>See on schedule</Button>
          {p.working?.status === 'Awaiting review' && <Button icon={FileText} onClick={() => nav(`/care-plans/${p.working!.id}?from=/clients/${c.id}`)}>Review care plan</Button>}
        </div>
      </div>

      {c.status === 'On hold' && <AlertBanner tone="warning" title="Care is on hold">{c.statusReason ?? ''} {c.coordinator} manages this client’s visits.</AlertBanner>}
      {p.working?.status === 'Awaiting review' && <AlertBanner tone="info" title={`Care plan version ${p.working.version} is waiting for approval`} action={<Button size="sm" onClick={() => nav(`/care-plans/${p.working!.id}?from=/clients/${c.id}`)}>Review now</Button>}>Sent by {p.working.createdBy} on {long(p.working.submittedDate)}.{p.current ? ` Version ${p.current.version} stays in use until you approve.` : ' Visits can’t start until you approve a plan.'}</AlertBanner>}
      {reviewOverdue(p.current) && !p.working && <AlertBanner tone="danger" title="Care plan review is overdue" action={<Button size="sm" variant="secondary" onClick={() => nav(`/care-plans/${p.current!.id}?from=/clients/${c.id}`)}>Record review</Button>}>It was due on {long(p.current!.reviewDate)}.</AlertBanner>}

      <div className="card">
        <div style={{ padding: '0 16px' }}><Tabs value={tab} onChange={setTab} tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'health', label: checkInDue(c) ? 'Health · update due' : 'Health', count: (c.health ?? []).length || undefined },
          { id: 'plan', label: `Care plan · ${pl.text}` },
          { id: 'documents', label: docsToCheck ? `Documents · ${docsToCheck} to check` : 'Documents', count: s.documents.filter(d => d.clientId === c.id && d.status !== 'Replaced').length },
          { id: 'visits', label: 'Visits', count: s.visits.filter(v => v.clientId === c.id && v.approval === 'To review').length || undefined },
        ]} /></div>
      </div>

      {tab === 'overview' && <Overview c={c} go={setTab} />}
      {tab === 'health' && <HealthTab c={c} />}
      {tab === 'plan' && <PlanTab c={c} />}
      {tab === 'documents' && <Documents c={c} />}
      {tab === 'visits' && <VisitsTab c={c} />}
    </>
  )
}

function Overview({ c, go }: { c: Client; go: (t: Tab) => void }) {
  const s = useStore()
  const nav = useNavigate()
  const upcoming = s.visits.filter(v => v.clientId === c.id && v.date >= TODAY && !['Cancelled', 'Completed'].includes(v.status)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).slice(0, 5)
  return (
    <div className="grid g-main-side" style={{ alignItems: 'start' }}>
      <div className="col" style={{ gap: 16 }}>
        <div className="card">
          <CardHead title="Details" sub={`${c.coordinator} (Care Coordinator) keeps these up to date.`} />
          <div className="card-body">
            <dl className="kv">
              <dt>Date of birth</dt><dd>{c.dob ? long(c.dob) : '—'}</dd>
              <dt>Phone</dt><dd className="row" style={{ gap: 6 }}><Phone size={13} />{c.phone || '—'}</dd>
              <dt>Home address</dt><dd className="row" style={{ gap: 6 }}><MapPin size={13} />{c.address || <span style={{ color: 'var(--status-danger)' }}>Not added yet</span>}</dd>
              <dt>Getting in</dt><dd className="row" style={{ gap: 6, alignItems: 'flex-start' }}><KeyRound size={13} style={{ marginTop: 3 }} />{c.access || <span style={{ color: 'var(--status-danger)' }}>Not added yet</span>}</dd>
              <dt>Language</dt><dd className="row" style={{ gap: 6 }}><Languages size={13} />{c.language || '—'}</dd>
              <dt>Likes and needs</dt><dd className="row" style={{ gap: 6, alignItems: 'flex-start' }}><Heart size={13} style={{ marginTop: 3 }} />{c.preferences || '—'}</dd>
              <dt>Services</dt><dd>{c.services}</dd>
              <dt>Paid by</dt><dd>{c.payer} <span className="t-caption t-muted">· rates and invoices are handled by Finance</span></dd>
            </dl>
          </div>
        </div>
        {c.assessment && <div className="card">
          <CardHead title="Home assessment" sub={`Done by ${c.assessment.by} on ${long(c.assessment.date)}, before ${c.name.split(' ')[0]} became a client.`} />
          <div className="card-body"><dl className="kv">
            <dt>Care needs</dt><dd>{c.assessment.needs}</dd><dt>Risks</dt><dd>{c.assessment.risks}</dd><dt>Getting around</dt><dd>{c.assessment.mobility}</dd><dt>Hours a week</dt><dd>{c.assessment.hours ?? '—'}</dd>
          </dl></div>
        </div>}
        <div className="card">
          <CardHead title="Upcoming visits" action={<button className="link-btn" onClick={() => go('visits')}>See all visits</button>} />
          <div className="card-body">
            {upcoming.length === 0 ? <div className="t-small t-muted">No visits planned.</div> : upcoming.map(v => (
              <button key={v.id} className="list-row clickable-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/visits/${v.id}?from=/clients/${c.id}`)}>
                <CalendarDays size={16} color="var(--text-muted)" />
                <div className="grow"><div className="t-medium t-small">{v.date === TODAY ? 'Today' : fmtDate(v.date)} · {v.start}–{v.end}</div><div className="t-caption t-muted">{v.service}{v.review ? ' · needs review' : ''}</div></div>
                {v.caregiverId ? <span className="t-small">{s.caregiver(v.caregiverId)?.name}</span> : <Chip tone="danger">No caregiver</Chip>}
                <ChevronRight size={16} color="var(--text-muted)" />
              </button>))}
          </div>
        </div>
      </div>
      <div className="col" style={{ gap: 16 }}>
        <div className="card">
          <CardHead title="Contacts" />
          <div className="card-body col" style={{ gap: 12 }}>
            {c.people.length === 0 ? <div className="t-small" style={{ color: 'var(--status-danger)' }}>No contacts yet.</div> : c.people.map(x => (
              <div key={x.id} className="row" style={{ alignItems: 'flex-start' }}><Avatar name={x.name} size="sm" /><div className="grow">
                <div className="row wrap" style={{ gap: 6 }}><span className="t-medium t-small">{x.name}</span>{x.emergency && <Chip tone="danger">Emergency</Chip>}{x.representative && <Chip tone="info">Representative</Chip>}</div>
                <div className="t-caption t-muted">{x.relationship} · {x.phone}</div>
                {x.email && <div className="t-caption t-muted row" style={{ gap: 4 }}><Mail size={11} />{x.email}</div>}
              </div></div>))}
          </div>
        </div>
        <div className="card">
          <CardHead title="History" sub="Every change to this client. Nothing is removed." />
          <div className="card-body timeline">
            {c.history.length === 0 ? <div className="t-small t-muted">No changes yet.</div> : [...c.history].reverse().map((h, i) => (
              <div key={i} className="timeline-item"><div className="stat-icon tone-neutral"><History /></div><div><div className="t-small">{h.text}</div><div className="t-caption t-muted">{h.by} · {h.at}</div></div></div>))}
          </div>
        </div>
      </div>
    </div>
  )
}

function PlanTab({ c }: { c: Client }) {
  const s = useStore()
  const nav = useNavigate()
  const p = plansFor(c.id, s.carePlans)
  const open = (id: string) => nav(`/care-plans/${id}?from=${encodeURIComponent(`/clients/${c.id}?tab=plan`)}`)
  return (
    <div className="grid g-main-side" style={{ alignItems: 'start' }}>
      <div className="card">
        <CardHead title={p.current ? `Plan in use · version ${p.current.version}` : 'No approved plan yet'} sub={p.current ? `Approved by ${p.current.approvedBy} · in use from ${long(p.current.effectiveDate)} · review by ${long(p.current.reviewDate)}` : 'Visits can’t be planned until you approve a care plan.'}
          action={p.current && <Button size="sm" variant="secondary" onClick={() => open(p.current!.id)}>Open</Button>} />
        <div className="card-body">{p.current ? <PlanView p={p.current} /> : p.working ? <Button onClick={() => open(p.working!.id)}>Open version {p.working.version} ({p.working.status.toLowerCase()})</Button> : <div className="t-small t-muted">{c.coordinator} hasn’t written a plan yet.</div>}</div>
      </div>
      <div className="card">
        <CardHead title="All versions" sub="Every version is kept. Click one to open it." />
        <div className="card-body">{p.all.map(x => (
          <button key={x.id} className="list-row clickable-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => open(x.id)}>
            <FileText size={16} color="var(--text-muted)" />
            <div className="grow"><div className="t-medium t-small">Version {x.version}</div><div className="t-caption t-muted">{x.status === 'Approved' || x.status === 'Superseded' ? `Approved ${long(x.approvedDate)}` : x.submittedDate ? `Sent ${long(x.submittedDate)}` : `Started ${long(x.createdDate)}`} · by {x.createdBy}</div></div>
            <Chip tone={planTone(x.status)}>{x.status === 'Superseded' ? 'Replaced' : x.status}</Chip><ChevronRight size={16} color="var(--text-muted)" />
          </button>))}</div>
      </div>
    </div>
  )
}

export function PlanView({ p, changed }: { p: CarePlan; changed?: Set<string> }) {
  const mark = (k: string) => changed?.has(k) ? { background: 'var(--status-warning-soft)', borderRadius: 4, padding: '1px 4px', margin: '-1px -4px' } : undefined
  return (
    <dl className="kv">
      <dt>Services</dt><dd><span style={mark('services')}>{p.services.join(', ') || '—'}</span></dd>
      <dt>Hours a week</dt><dd><span style={mark('hours')}>{p.hoursPerWeek ?? '—'}</span></dd>
      <dt>Tasks each visit</dt><dd style={mark('tasks')}>{p.tasks.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{p.tasks.map(t => <li key={t}>{t}</li>)}</ul> : '—'}</dd>
      <dt>Instructions</dt><dd style={{ whiteSpace: 'pre-wrap', ...mark('instructions') }}>{p.instructions || '—'}</dd>
      <dt>Goals</dt><dd style={mark('goals')}>{p.goals || '—'}</dd>
      <dt>Review by</dt><dd><span style={mark('review')}>{long(p.reviewDate)}</span></dd>
    </dl>
  )
}

function Documents({ c }: { c: Client }) {
  const s = useStore()
  const [checking, setChecking] = useState<string | null>(null)
  const docs = s.documents.filter(d => d.clientId === c.id).sort((a, b) => (a.status === 'Not checked' ? 0 : 1) - (b.status === 'Not checked' ? 0 : 1) || b.date.localeCompare(a.date))
  const doc = s.documents.find(d => d.id === checking)
  return (
    <div className="card">
      <CardHead title="Documents" sub={`${c.coordinator} uploads them. Uploading doesn’t mean checked — you check each one. Replaced files are kept.`} />
      {docs.length === 0 ? <EmptyState icon={FileText} tone="neutral" title="No documents" text="Nothing has been uploaded for this client yet." /> :
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Document</th><th>Type</th><th>Uploaded</th><th>Runs out</th><th>Status</th><th /></tr></thead>
          <tbody>{docs.map(d => { const exp = docExpired(d); return (
            <tr key={d.id} style={{ opacity: d.status === 'Replaced' ? .6 : 1 }}>
              <td><div className="t-medium row" style={{ gap: 6 }}><FileText size={14} />{d.name}</div>{d.reason && <div className="t-caption" style={{ color: d.status === 'Rejected' ? 'var(--status-danger)' : 'var(--text-muted)' }}>{d.reason}</div>}{d.checkedBy && <div className="t-caption t-muted">{d.status === 'Checked' ? 'Checked' : d.status === 'Rejected' ? 'Rejected' : 'Marked'} by {d.checkedBy}{d.checkedDate ? ` · ${long(d.checkedDate)}` : ''}</div>}</td>
              <td>{d.category}</td><td>{long(d.date)}<div className="t-caption t-muted">{d.uploadedBy}</div></td>
              <td style={{ color: exp ? 'var(--status-danger)' : expiringSoon(d.expiry) ? 'var(--status-warning)' : undefined }}>{d.expiry ? long(d.expiry) : '—'}</td>
              <td><Chip tone={exp ? 'danger' : docTone(d.status)}>{exp ? 'Expired' : d.status}</Chip></td>
              <td style={{ textAlign: 'right' }}>{d.status === 'Not checked' ? <Button size="sm" icon={ShieldCheck} onClick={() => setChecking(d.id)}>Check</Button> : d.status !== 'Replaced' && <Button size="sm" variant="secondary" onClick={() => setChecking(d.id)}>Change</Button>}</td>
            </tr>) })}</tbody>
        </table></div>}
      {doc && <DocCheckModal doc={doc} onClose={() => setChecking(null)} />}
    </div>
  )
}

function VisitsTab({ c }: { c: Client }) {
  const s = useStore()
  const nav = useNavigate()
  const [show, setShow] = useState<'upcoming' | 'past'>('upcoming')
  const list = useMemo(() => s.visits.filter(v => v.clientId === c.id).filter(v => show === 'upcoming' ? v.date >= TODAY && v.status !== 'Completed' : v.date < TODAY || v.status === 'Completed')
    .sort((a, b) => show === 'upcoming' ? (a.date + a.start).localeCompare(b.date + b.start) : (b.date + b.start).localeCompare(a.date + a.start)), [s.visits, c.id, show])
  const tone = (st: string): ChipTone => st === 'Completed' ? 'success' : st === 'Unassigned' ? 'danger' : st === 'Cancelled' ? 'neutral' : 'info'
  return (
    <div className="card">
      <CardHead title="Visits" sub="Click a visit to open it." action={
        <div className="seg" role="group"><button className={show === 'upcoming' ? 'on' : ''} onClick={() => setShow('upcoming')}>Upcoming</button><button className={show === 'past' ? 'on' : ''} onClick={() => setShow('past')}>Past</button></div>} />
      {list.length === 0 ? <EmptyState icon={CalendarDays} tone="neutral" title={show === 'upcoming' ? 'No visits planned' : 'No past visits yet'} text={show === 'upcoming' ? `${c.coordinator} plans the visits.` : 'Finished visits appear here.'} /> :
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Date</th><th>Planned</th><th>Service</th><th>Caregiver</th><th>Status</th>{show === 'past' && <th>Your check</th>}</tr></thead>
          <tbody>{list.map(v => { const fl = serviceFlags(v, planForVisit(v, s.carePlans), s.rules.lateArrivalMins); return (
            <tr key={v.id} className="clickable" onClick={() => nav(`/visits/${v.id}?from=/clients/${c.id}`)}>
              <td>{v.date === TODAY ? 'Today' : fmtDate(v.date)}</td><td>{v.start}–{v.end}</td><td>{v.service}</td>
              <td>{s.caregiver(v.caregiverId)?.name ?? <span style={{ color: 'var(--status-danger)' }}>None yet</span>}</td>
              <td><Chip tone={tone(v.status)}>{v.status}</Chip>{v.review && <div className="t-caption" style={{ color: 'var(--status-warning)' }}>Needs review</div>}{v.cancelReason && <div className="t-caption t-muted">{v.cancelReason}</div>}</td>
              {show === 'past' && <td>{v.approval ? <Chip tone={v.approval === 'Approved' ? 'success' : v.approval === 'Sent back' ? 'danger' : 'warning'}>{v.approval}</Chip> : <span className="t-muted">—</span>}{v.approval === 'To review' && fl.length > 0 && <div className="t-caption" style={{ color: 'var(--status-warning)' }}>{fl.length} thing{fl.length > 1 ? 's' : ''} to look at</div>}</td>}
            </tr>) })}</tbody>
        </table></div>}
      <div className="card-body t-caption t-muted row" style={{ gap: 6 }}><ClipboardList size={12} />Each visit is checked against the care plan that applied on that day.</div>
    </div>
  )
}

function HealthTab({ c }: { c: Client }) {
  const s = useStore()
  const nav = useNavigate()
  const [type, setType] = useState<HealthNote['type']>('Change in health')
  const [text, setText] = useState('')
  const [risk, setRisk] = useState(false)
  const notes = (c.health ?? []).slice().sort((a, b) => b.date.localeCompare(a.date))
  const incidents = s.incidents.filter(i => i.client === c.name).sort((a, b) => b.date.localeCompare(a.date))
  const add = () => {
    if (text.trim().length < 5) return
    const n: HealthNote = { by: s.me.name, at: stampNow(), date: TODAY, type, text: text.trim() }
    s.setClients(x => x.map(y => y.id === c.id ? { ...y, health: [...(y.health ?? []), n] } : y))
    s.clientNote(c.id, `Health update added (${type.toLowerCase()}).`)
    s.toast(`Health update saved. ${c.coordinator} and the Care Supervisor can see it.`); setText('')
  }
  return (
    <div className="grid g-main-side" style={{ alignItems: 'start' }}>
      <div className="col" style={{ gap: 16 }}>
        {checkInDue(c) && <AlertBanner tone="warning" title="Health update due">{c.name.split(' ')[0]} is high risk. Add an update at least every 7 days{lastHealth(c) ? ` — the last one was ${long(lastHealth(c)!.date)}` : ''}.</AlertBanner>}
        <div className="card">
          <CardHead title="Health updates" sub="Changes in health, hospital stays, calls with family and nurse home visits. Nothing is removed." />
          <div className="card-body col" style={{ gap: 14 }}>
            <div className="col" style={{ gap: 8 }}>
              <div className="grid g-2"><Field label="Type of update"><Select value={type} onChange={e => setType(e.target.value as HealthNote['type'])} options={[...HEALTH_TYPES]} /></Field><span /></div>
              <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="For example: home visit today — wound healing well, no pain" />
              <div className="row between"><span className="t-caption t-muted">The coordinator and the Care Supervisor see these updates.</span><Button disabled={text.trim().length < 5} onClick={add}>Add update</Button></div>
            </div>
            <div className="divider" />
            {notes.length === 0 ? <div className="t-small t-muted">No health updates yet.</div> : <div className="timeline">{notes.map((n, i) => (
              <div key={i} className="timeline-item"><Avatar name={n.by} size="sm" /><div><div className="row wrap" style={{ gap: 6 }}><Chip tone={n.type === 'Hospital stay' ? 'danger' : n.type === 'Change in health' ? 'warning' : 'info'}>{n.type}</Chip></div><div className="t-small" style={{ marginTop: 4 }}>{n.text}</div><div className="t-caption t-muted">{n.by} · {n.at}</div></div></div>))}</div>}
          </div>
        </div>
      </div>
      <div className="col" style={{ gap: 16 }}>
        <div className="card">
          <CardHead title="Risk level" action={<button className="link-btn" onClick={() => setRisk(true)}>Change</button>} />
          <div className="card-body col" style={{ gap: 8 }}>
            {c.risk ? <><div><Chip tone={riskTone(c.risk.level)}>{c.risk.level} risk</Chip></div><div className="t-small">{c.risk.why}</div><div className="t-caption t-muted">Set by {c.risk.by} · {long(c.risk.date)}</div></> : <div className="t-small t-muted">Not set yet.</div>}
            <div className="hint">High risk clients need a health update at least every 7 days.</div>
          </div>
        </div>
        <div className="card">
          <CardHead title="Incidents" sub="Everything reported for this client." />
          <div className="card-body">{incidents.length === 0 ? <div className="t-small t-muted">None.</div> : incidents.map(i => (
            <button key={i.id} className="list-row clickable-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/incidents/${i.id}?from=${encodeURIComponent(`/clients/${c.id}?tab=health`)}`)}>
              <div className="grow"><div className="t-small t-medium">{i.title}</div><div className="t-caption t-muted">{long(i.date)} · {i.category}</div></div><Chip tone={i.status === 'Closed' || i.status === 'Resolved' ? 'success' : 'warning'}>{i.status}</Chip><ChevronRight size={16} color="var(--text-muted)" />
            </button>))}</div>
        </div>
      </div>
      {risk && <RiskModal c={c} onClose={() => setRisk(false)} />}
    </div>
  )
}

export function RiskModal({ c, onClose }: { c: Client; onClose: () => void }) {
  const s = useStore()
  const [level, setLevel] = useState<RiskLevel>(c.risk?.level ?? 'Medium')
  const [why, setWhy] = useState(''); const [tried, setTried] = useState(false); const bad = why.trim().length < 5
  const save = () => {
    setTried(true); if (bad) return
    s.setClients(x => x.map(y => y.id === c.id ? { ...y, risk: { level, why: why.trim(), by: s.me.name, date: TODAY } } : y))
    s.clientNote(c.id, `Risk level set to ${level.toLowerCase()} by ${s.me.name}: ${why.trim()}`)
    s.log({ type: 'Client health', action: 'Changed risk level', record: c.name, before: c.risk?.level ?? 'Not set', after: level, reason: why.trim() })
    s.toast(`${c.name} is now ${level.toLowerCase()} risk.`); onClose()
  }
  return (
    <Modal title={`Risk level for ${c.name}`} sub="How closely the nursing team watches this client’s health." onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <Field label="Risk level" required><Select value={level} onChange={e => setLevel(e.target.value as RiskLevel)} options={['High', 'Medium', 'Low']} /></Field>
      <Field label="Why?" required error={tried && bad ? 'Please write a short reason (at least 5 letters).' : undefined} helper="Shown on the client and in Clients’ health."><Textarea value={why} onChange={e => setWhy(e.target.value)} error={tried && bad} placeholder="For example: back from hospital, needs closer watching for 2 weeks" /></Field>
    </Modal>
  )
}
