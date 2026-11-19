import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Phone, Lock, CalendarDays, Clock, Users, Search, ShieldCheck, ShieldAlert, ShieldX, BadgeCheck, Building2 } from 'lucide-react'
import { useStore, fmtDate, hoursBetween } from '../data/store'
import { Caregiver, TODAY } from '../data/seed'
import { DAY_NAMES, weekHours } from '../data/schedule'
import { AlertBanner, Avatar, Button, CardHead, Chip, ChipTone, EmptyState, StatTile, Tabs } from '../components/ui'
import { CgCheckModal, checkTone, expiringSoon } from '../components/CheckActions'
import { reviewState } from '../data/nursing'
import { ReviewModal, outcomeTone, reviewTone, sessionState } from './Staff'

const rTone = (r: Caregiver['readiness']): ChipTone => r === 'Ready' ? 'success' : r === 'Warning' ? 'warning' : 'danger'
const rText = (r: Caregiver['readiness']) => r === 'Blocked' ? 'Not ready' : r === 'Warning' ? 'Ready with warning' : 'Ready'
const WEEK = [1, 2, 3, 4, 5, 6, 0]
const vTone = (st: string): ChipTone => st === 'Completed' ? 'success' : st === 'Cancelled' ? 'neutral' : 'info'
type Tab = 'profile' | 'checks' | 'staff' | 'visits' | 'clients'

export default function CaregiverDetail() {
  const { id } = useParams()
  const s = useStore()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (['checks', 'staff', 'visits', 'clients'].includes(params.get('tab') ?? '') ? params.get('tab') : 'profile') as Tab
  const from = params.get('from') ?? '/caregivers'
  const setTab = (t: Tab) => { const p = new URLSearchParams(params); if (t === 'profile') p.delete('tab'); else p.set('tab', t); setParams(p, { replace: true }) }
  const g = s.caregivers.find(x => x.id === id)
  if (!g || !s.inBranch(g.branch)) return <div className="card"><EmptyState icon={Search} tone="neutral" title="We can’t find this caregiver" text="They may work in another branch." action={<Button onClick={() => nav('/caregivers')}>All caregivers</Button>} /></div>

  const mine = s.visits.filter(v => v.caregiverId === g.id)
  const upcoming = mine.filter(v => v.date >= TODAY && !['Cancelled', 'Completed'].includes(v.status)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  const booked = weekHours(g.id, TODAY, s.visits)
  const known = Array.from(new Set(mine.filter(v => v.status === 'Completed').map(v => v.clientId)))
  const backLabel = from.startsWith('/visits/') ? 'Visit' : from.startsWith('/checks') ? 'Checks' : from.startsWith('/staff') ? 'Reviews and training' : 'Caregivers'
  const myChecks = s.checks.filter(k => k.caregiverId === g.id)
  const toDo = myChecks.filter(k => ['To do', 'Waiting for check', 'Expired'].includes(k.status)).length

  return (
    <>
      <div className="page-head">
        <div>
          <Link to={from} className="row t-small t-medium" style={{ gap: 6, marginBottom: 8 }}><ArrowLeft size={15} />{backLabel}</Link>
          <div className="row wrap" style={{ gap: 12 }}>
            <Avatar name={g.name} size="lg" />
            <div>
              <div className="row wrap" style={{ gap: 10 }}><h1 className="t-h1">{g.name}</h1><Chip tone={rTone(g.readiness)}>{rText(g.readiness)}</Chip></div>
              <div className="t-small t-muted" style={{ marginTop: 2 }}>{g.type} · {s.branchName(g.branch)} · <Phone size={12} style={{ verticalAlign: -1 }} /> {g.phone}</div>
            </div>
          </div>
          <div className="crumbs"><Link to="/">Home</Link><span>/</span><Link to="/caregivers">Caregivers</Link><span>/</span><span>{g.name}</span></div>
        </div>
        <div className="actions"><Button icon={CalendarDays} onClick={() => nav(`/schedule?caregiver=${g.id}`)}>See on schedule</Button></div>
      </div>

      {g.readiness === 'Blocked' && <AlertBanner tone="danger" title="Can’t be given visits right now">{g.issue}. HR is sorting this out. {upcoming.length ? `Their ${upcoming.length} upcoming visit${upcoming.length > 1 ? 's need' : ' needs'} a new caregiver or an exception from you.` : ''}</AlertBanner>}
      {g.readiness === 'Warning' && <AlertBanner tone="warning" title="Can work, with a reminder">{g.issue}. HR has been told.</AlertBanner>}

      <div className="grid g-4">
        <StatTile icon={CalendarDays} tone="info" label="Visits still to come" value={upcoming.length} foot={upcoming[0] ? `Next: ${upcoming[0].date === TODAY ? 'today' : fmtDate(upcoming[0].date)} ${upcoming[0].start}` : 'Nothing booked'} />
        <StatTile icon={Clock} tone={booked > g.maxHours ? 'danger' : 'success'} label="Hours this week" value={`${booked} / ${g.maxHours}`} foot={booked > g.maxHours ? 'Over their weekly limit' : `${g.maxHours - booked} hours still free`} />
        <StatTile icon={Users} tone="neutral" label="Clients they know" value={known.length} foot="Has visited before" />
        <StatTile icon={BadgeCheck} tone={rTone(g.readiness)} label="Ready to work" value={g.readiness === 'Blocked' ? 'No' : 'Yes'} foot={g.issue ?? 'All requirements checked'} />
      </div>

      <div className="card">
        <div style={{ padding: '0 16px' }}><Tabs value={tab} onChange={setTab} tabs={[{ id: 'profile', label: 'Profile' }, { id: 'checks', label: toDo ? `Skills checks · ${toDo} to do` : 'Skills checks', count: myChecks.length }, { id: 'staff', label: 'Reviews and training' }, { id: 'visits', label: 'Visits', count: upcoming.length }, { id: 'clients', label: 'Clients', count: known.length }]} /></div>
      </div>

      {tab === 'profile' && <div className="grid g-main-side" style={{ alignItems: 'start' }}>
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <CardHead title="When they usually work" sub={`This week. Up to ${g.maxHours} hours a week. Visits outside these times show a warning when you assign them.`} />
            <div className="card-body">
              <div className="grid" style={{ gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 8 }}>
                {WEEK.map(d => { const on = g.days.includes(d); const dayHrs = mine.filter(v => v.status !== 'Cancelled' && v.date === dateThisWeek(d)).reduce((a, v) => a + hoursBetween(v.start, v.end), 0); return (
                  <div key={d} className="card card-pad" style={{ textAlign: 'center', padding: 12, background: on ? 'var(--status-success-soft)' : 'var(--bg-subtle)', borderColor: on ? '#B5E2C8' : undefined }}>
                    <div className="t-strong">{DAY_NAMES[d]}</div>
                    <div className="t-caption" style={{ color: on ? 'var(--status-success)' : 'var(--text-muted)', marginTop: 4 }}>{on ? `${g.from}–${g.to}` : 'Off'}</div>
                    {on && <div className="t-caption t-muted" style={{ marginTop: 2 }}>{dayHrs ? `${dayHrs} h this week` : 'Free'}</div>}
                  </div>) })}
              </div>
            </div>
          </div>
          <div className="card">
            <CardHead title="Next visits" action={<button className="link-btn" onClick={() => setTab('visits')}>See all</button>} />
            <div className="card-body">
              {upcoming.length === 0 ? <div className="t-small t-muted">No visits booked.</div> : upcoming.slice(0, 5).map(v => (
                <button key={v.id} className="list-row clickable-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/visits/${v.id}?from=/caregivers/${g.id}`)}>
                  <CalendarDays size={16} color="var(--text-muted)" /><div className="grow"><div className="t-small t-medium">{v.date === TODAY ? 'Today' : fmtDate(v.date)} · {v.start}–{v.end}</div><div className="t-caption t-muted">{s.client(v.clientId)?.name} · {v.service}</div></div>
                </button>))}
            </div>
          </div>
        </div>
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <CardHead title="Profile" />
            <div className="card-body">
              <dl className="kv" style={{ gridTemplateColumns: '110px 1fr' }}>
                <dt>Phone</dt><dd>{g.phone}</dd>
                <dt>Type</dt><dd>{g.type}</dd>
                <dt>Branch</dt><dd className="row" style={{ gap: 6 }}><Building2 size={13} />{s.branchName(g.branch)}</dd>
                <dt>Trained for</dt><dd><span className="row wrap" style={{ gap: 6 }}>{g.skills.map(k => <Chip key={k} tone="info">{k}</Chip>)}</span></dd>
                <dt>Not trained for</dt><dd>{s.lists.services.filter(x => x.active && !g.skills.includes(x.name)).map(x => x.name).join(', ') || '—'}</dd>
              </dl>
            </div>
          </div>
          <div className="card">
            <CardHead title="Readiness" />
            <div className="card-body col" style={{ gap: 10 }}>
              <div className="row" style={{ gap: 10 }}>{g.readiness === 'Ready' ? <ShieldCheck size={22} color="var(--status-success)" /> : g.readiness === 'Warning' ? <ShieldAlert size={22} color="var(--status-warning)" /> : <ShieldX size={22} color="var(--status-danger)" />}<div><div className="t-medium">{rText(g.readiness)}</div><div className="t-caption t-muted">{g.issue ?? 'Every requirement is checked and in date.'}</div></div></div>
              <div className="row t-caption t-muted" style={{ gap: 6 }}><Lock size={12} />Documents and pay are kept by the HR Officer and aren’t shown here.</div>
            </div>
          </div>
        </div>
      </div>}

      {tab === 'checks' && <ChecksTab gid={g.id} />}
      {tab === 'staff' && <StaffTab gid={g.id} />}
      {tab === 'visits' && <VisitsTab gid={g.id} />}

      {tab === 'clients' && <div className="card">
        <CardHead title="Clients they know" sub="Clients this caregiver has visited. Families usually like the same caregivers." />
        {known.length === 0 ? <EmptyState icon={Users} tone="neutral" title="No clients yet" text="Clients appear here after their first finished visit." /> :
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Client</th><th className="num">Visits done</th><th>Last visit</th><th>Next visit with them</th></tr></thead>
            <tbody>{known.map(cid => { const c = s.client(cid)!; const done = mine.filter(v => v.clientId === cid && v.status === 'Completed').sort((a, b) => b.date.localeCompare(a.date)); const next = upcoming.find(v => v.clientId === cid); return (
              <tr key={cid} className="clickable" onClick={() => nav(`/clients/${cid}`)}>
                <td><span className="row"><Avatar name={c.name} size="sm" />{c.name}</span></td><td className="num">{done.length}</td>
                <td>{fmtDate(done[0].date)}</td><td>{next ? `${next.date === TODAY ? 'Today' : fmtDate(next.date)} ${next.start}` : <span className="t-muted">None booked</span>}</td>
              </tr>) })}</tbody>
          </table></div>}
      </div>}
    </>
  )
}

/** The date of a weekday (0=Sun) in the current Monday–Sunday week. */
function dateThisWeek(day: number) { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + ((day + 6) % 7)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function weekEnd() { const d = new Date(); d.setDate(d.getDate() + (7 - ((d.getDay() + 6) % 7)) - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

function ChecksTab({ gid }: { gid: string }) {
  const s = useStore()
  const [open, setOpen] = useState<string | null>(null)
  const list = s.checks.filter(k => k.caregiverId === gid)
  const k = s.checks.find(x => x.id === open)
  const long = (d?: string) => d ? fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
  return (
    <div className="card">
      <CardHead title="Skills checks" sub="Skills checks and spot checks done by the nursing team (Care Supervisors and you). HR checks documents like ID, background and certificates." />
      {list.length === 0 ? <EmptyState icon={ShieldCheck} tone="neutral" title="No checks given to you" text="HR hasn’t given you any checks for this caregiver." /> :
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Check</th><th>Due or runs out</th><th>Last checked</th><th>Status</th><th /></tr></thead>
          <tbody>{list.map(x => { const date = x.status === 'Checked' || x.status === 'Expired' ? x.expiry : x.due; const needs = ['To do', 'Waiting for check', 'Expired'].includes(x.status); return (
            <tr key={x.id}>
              <td><div className="t-medium">{x.name}</div><div className="t-caption t-muted">{x.why}</div>{x.evidence && needs && <div className="t-caption" style={{ color: 'var(--status-info)' }}>{x.evidence}</div>}{x.reason && <div className="t-caption t-muted">{x.reason}</div>}</td>
              <td style={{ color: date && date < TODAY && x.status !== 'Not needed' ? 'var(--status-danger)' : expiringSoon(date) ? 'var(--status-warning)' : undefined }}>{long(date)}</td>
              <td>{x.checkedBy ? <>{x.checkedBy}<div className="t-caption t-muted">{long(x.checkedDate)}</div></> : <span className="t-muted">Never</span>}</td>
              <td><Chip tone={checkTone(x.status)}>{x.status}</Chip></td>
              <td style={{ textAlign: 'right' }}><Button size="sm" variant={needs ? 'primary' : 'secondary'} onClick={() => setOpen(x.id)}>{needs ? (x.status === 'Waiting for check' ? 'Check' : 'Record check') : 'Change'}</Button></td>
            </tr>) })}</tbody>
        </table></div>}
      {k && <CgCheckModal k={k} onClose={() => setOpen(null)} />}
    </div>
  )
}

function VisitsTab({ gid }: { gid: string }) {
  const s = useStore()
  const nav = useNavigate()
  const [show, setShow] = useState<'upcoming' | 'past'>('upcoming')
  const list = useMemo(() => s.visits.filter(v => v.caregiverId === gid).filter(v => show === 'upcoming' ? v.date >= TODAY && v.status !== 'Completed' && v.status !== 'Cancelled' : v.date < TODAY || v.status === 'Completed')
    .sort((a, b) => show === 'upcoming' ? (a.date + a.start).localeCompare(b.date + b.start) : (b.date + b.start).localeCompare(a.date + a.start)), [s.visits, gid, show])
  return (
    <div className="card">
      <CardHead title="Visits" sub="Click a visit to open it." action={<div className="seg" role="group"><button className={show === 'upcoming' ? 'on' : ''} onClick={() => setShow('upcoming')}>Upcoming</button><button className={show === 'past' ? 'on' : ''} onClick={() => setShow('past')}>Past</button></div>} />
      {list.length === 0 ? <EmptyState icon={CalendarDays} tone="neutral" title={show === 'upcoming' ? 'No visits booked' : 'No past visits'} text="Visits appear here once they’re planned." /> :
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Date</th><th>Time</th><th>Client</th><th>Service</th><th>Checked in / out</th><th>Status</th></tr></thead>
          <tbody>{list.map(v => (
            <tr key={v.id} className="clickable" onClick={() => nav(`/visits/${v.id}?from=/caregivers/${gid}`)}>
              <td>{v.date === TODAY ? 'Today' : fmtDate(v.date)}</td><td>{v.start}–{v.end}</td><td className="t-medium">{s.client(v.clientId)?.name}</td><td>{v.service}</td>
              <td>{v.checkIn ? `${v.checkIn}${v.checkOut ? ` – ${v.checkOut}` : ''}` : <span className="t-muted">—</span>}</td>
              <td><Chip tone={vTone(v.status)}>{v.status}</Chip></td>
            </tr>))}</tbody>
        </table></div>}
    </div>
  )
}

function StaffTab({ gid }: { gid: string }) {
  const s = useStore()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const r = s.reviews.find(x => x.personId === gid)
  const sessions = s.trainings.filter(t => t.invited.includes(gid)).sort((a, b) => b.date.localeCompare(a.date))
  const long = (d: string) => fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <div className="grid g-2" style={{ alignItems: 'start' }}>
      <div className="card">
        <CardHead title="Yearly reviews" sub={r ? `Next review due ${long(r.due)}` : 'No review set up.'} action={r && <Button size="sm" onClick={() => setOpen(true)}>Record review</Button>} />
        <div className="card-body">
          {r && <div style={{ marginBottom: 10 }}><Chip tone={reviewTone(reviewState(r))}>{reviewState(r)}</Chip></div>}
          {!r || r.history.length === 0 ? <div className="t-small t-muted">No reviews yet.</div> : [...r.history].reverse().map((h, i) => (
            <div key={i} className="list-row" style={{ alignItems: 'flex-start' }}><div className="grow"><div className="row" style={{ gap: 8 }}><Chip tone={outcomeTone(h.outcome)}>{h.outcome}</Chip><span className="t-caption t-muted">{long(h.date)} · {h.by}</span></div><div className="t-small" style={{ marginTop: 4 }}>{h.note}</div></div></div>))}
        </div>
      </div>
      <div className="card">
        <CardHead title="Training" sub="Sessions they were invited to." />
        <div className="card-body">{sessions.length === 0 ? <div className="t-small t-muted">No sessions.</div> : sessions.map(t => { const st = sessionState(t); const came = t.attended?.includes(gid); return (
          <button key={t.id} className="list-row clickable-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/training/${t.id}`)}>
            <div className="grow"><div className="t-small t-medium">{t.title}</div><div className="t-caption t-muted">{long(t.date)} · {t.place}</div></div>
            {t.attended ? <Chip tone={came ? 'success' : 'danger'}>{came ? 'Came' : 'Didn’t come'}</Chip> : <Chip tone={st.tone}>{st.text}</Chip>}
          </button>) })}</div>
      </div>
      {open && r && <ReviewModal r={r} onClose={() => setOpen(false)} />}
    </div>
  )
}
