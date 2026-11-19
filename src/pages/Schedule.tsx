import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, UserPlus, XCircle, CheckCircle2, LayoutGrid, List, Clock, MapPin, X, Plus, CalendarClock, TriangleAlert, KeyRound, Phone, Repeat } from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { Visit, TODAY, iso } from '../data/seed'
import { liveState } from '../data/schedule'
import { plansFor } from '../data/clients'
import { AlertBanner, Avatar, Button, Chip, ChipTone, Drawer, EmptyState, Field, Modal, PageHead, Textarea } from '../components/ui'

const vTone = (v: Visit): ChipTone => v.status === 'Completed' ? 'success' : v.status === 'Unassigned' ? 'danger' : v.status === 'Cancelled' ? 'neutral' : 'info'
const mondayOf = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }

export default function Schedule() {
  const s = useStore()
  const [params, setParams] = useSearchParams()
  const [week, setWeek] = useState(() => mondayOf(new Date()))
  const [view, setView] = useState<'board' | 'list'>('board')
  const [show, setShow] = useState('All visits')
  const [cg, setCg] = useState(params.get('caregiver') ?? 'all')
  const [cl, setCl] = useState(params.get('client') ?? 'all')
  const nav = useNavigate()
  const open = (v: Visit) => nav(`/visits/${v.id}?from=/schedule`)
  useEffect(() => {
    const vid = params.get('visit')
    if (vid) nav(`/visits/${vid}?from=/schedule`, { replace: true })
    if (params.get('client')) setCl(params.get('client')!)
    if (params.get('caregiver')) setCg(params.get('caregiver')!)
  }, [params])
  const clearUrl = () => { if ([...params.keys()].length) setParams({}, { replace: true }) }

  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(week); d.setDate(d.getDate() + i); return iso(d) })
  const vis = useMemo(() => s.visits.filter(v => s.inBranch(v.branch) && days.includes(v.date) &&
    (show === 'All visits' || (show === 'Needs a caregiver' ? v.status === 'Unassigned' : v.status !== 'Cancelled')) &&
    (cg === 'all' || v.caregiverId === cg) && (cl === 'all' || v.clientId === cl)), [s.visits, s.branch, days.join(), show, cg, cl])
  const cgs = s.caregivers.filter(g => s.inBranch(g.branch) && (cg === 'all' || g.id === cg))
  const cls = (v: Visit) => v.status === 'Cancelled' ? 'cancel' : v.status === 'Unassigned' ? 'open' : v.status === 'Completed' ? 'done' : v.review || s.caregiver(v.caregiverId)?.readiness === 'Blocked' ? 'warn' : 'ok'
  const Shift = ({ v }: { v: Visit }) => (
    <button className={`shift ${cls(v)}`} onClick={() => open(v)} title={`${s.client(v.clientId)?.name} ${v.start}–${v.end}`}>
      <b>{v.start}</b> {s.client(v.clientId)?.name}<div className="t-caption" style={{ opacity: .8 }}>{v.service}</div>
    </button>)

  return (
    <>
      <PageHead title="Schedule" crumb="Schedule" sub={`${s.branchName(s.branch)} · all times in ${s.agency.timezone}. Care Coordinators plan the visits; open one to change the caregiver or make an exception.`} />
      <div className="card">
        <div className="toolbar">
          <div className="row" style={{ gap: 6 }}>
            <button className="icon-btn" aria-label="Previous week" onClick={() => { const d = new Date(week); d.setDate(d.getDate() - 7); setWeek(d) }}><ChevronLeft size={16} /></button>
            <Button size="sm" variant="secondary" onClick={() => setWeek(mondayOf(new Date()))}>This week</Button>
            <button className="icon-btn" aria-label="Next week" onClick={() => { const d = new Date(week); d.setDate(d.getDate() + 7); setWeek(d) }}><ChevronRight size={16} /></button>
            <span className="t-strong" style={{ marginLeft: 6 }}>{fmtDate(days[0], { day: 'numeric', month: 'short' })} – {fmtDate(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <span className="grow" />
          <select className="select-sm" aria-label="Which visits" value={show} onChange={e => setShow(e.target.value)}>{['All visits', 'Needs a caregiver', 'Hide cancelled'].map(o => <option key={o}>{o}</option>)}</select>
          <select className="select-sm" aria-label="Caregiver" value={cg} onChange={e => { setCg(e.target.value); clearUrl() }}><option value="all">All caregivers</option>{s.caregivers.filter(g => s.inBranch(g.branch)).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          <select className="select-sm" aria-label="Client" value={cl} onChange={e => { setCl(e.target.value); clearUrl() }}><option value="all">All clients</option>{s.clients.filter(c => s.inBranch(c.branch) && c.status !== 'Discharged').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          {(cg !== 'all' || cl !== 'all' || show !== 'All visits') && <Button size="sm" variant="ghost" icon={X} onClick={() => { setCg('all'); setCl('all'); setShow('All visits'); clearUrl() }}>Clear</Button>}
          <div className="seg" role="group" aria-label="View">
            <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}><LayoutGrid size={14} style={{ verticalAlign: -2 }} /> Week</button>
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><List size={14} style={{ verticalAlign: -2 }} /> List</button>
          </div>
        </div>
        <div className="row t-caption t-secondary" style={{ gap: 16, padding: '10px 16px', borderBottom: '1px solid var(--border-default)' }}>
          {[['ok', 'Planned'], ['done', 'Done'], ['open', 'No caregiver'], ['warn', 'Needs review'], ['cancel', 'Cancelled']].map(([c, l]) => <span key={c} className="row" style={{ gap: 6 }}><span className={`shift ${c}`} style={{ width: 14, height: 10, padding: 0, margin: 0 }} />{l}</span>)}
        </div>
        {vis.length === 0 ? <EmptyState icon={CheckCircle2} title={show === 'Needs a caregiver' ? 'Every visit has a caregiver' : 'No visits this week'} text="Try another week or clear the filters." />
          : view === 'board' ? (
            <div className="table-wrap"><div className="board">
              <div className="bh">Caregiver</div>
              {days.map(d => <div key={d} className={`bh ${d === TODAY ? 'today' : ''}`}>{fmtDate(d, { weekday: 'short', day: 'numeric' })}{d === TODAY && ' · Today'}</div>)}
              {cg === 'all' && <>
                <div style={{ background: 'var(--status-danger-soft)' }}><div className="t-strong" style={{ color: 'var(--status-danger)' }}>No caregiver yet</div><div className="t-caption t-muted">{vis.filter(v => !v.caregiverId && v.status !== 'Cancelled').length} visits</div></div>
                {days.map(d => <div key={d}>{vis.filter(v => v.date === d && !v.caregiverId).map(v => <Shift key={v.id} v={v} />)}</div>)}
              </>}
              {show !== 'Needs a caregiver' && cgs.map(g => (
                <Row key={g.id}>
                  <div><div className="row" style={{ gap: 8 }}><Avatar name={g.name} size="sm" /><span className="t-medium">{g.name}</span></div>
                    <div className="t-caption t-muted" style={{ marginTop: 4 }}>{g.type}</div>
                    {g.readiness !== 'Ready' && <div className="t-caption" style={{ color: g.readiness === 'Blocked' ? 'var(--status-danger)' : 'var(--status-warning)' }}>{g.readiness === 'Blocked' ? 'Not ready' : 'Warning'}</div>}</div>
                  {days.map(d => <div key={d}>{vis.filter(v => v.date === d && v.caregiverId === g.id).map(v => <Shift key={v.id} v={v} />)}</div>)}
                </Row>))}
            </div></div>
          ) : (
            <div className="table-wrap"><table className="tbl">
              <thead><tr><th>Date</th><th>Time</th><th>Client</th><th>Service</th><th>Caregiver</th><th>Status</th></tr></thead>
              <tbody>{vis.slice().sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).map(v => (
                <tr key={v.id} className="clickable" onClick={() => open(v)}>
                  <td>{v.date === TODAY ? 'Today' : fmtDate(v.date)}</td><td>{v.start}–{v.end}</td><td className="t-medium">{s.client(v.clientId)?.name}</td><td>{v.service}</td>
                  <td>{s.caregiver(v.caregiverId)?.name ?? <span style={{ color: 'var(--status-danger)' }}>None yet</span>}</td>
                  <td><Chip tone={vTone(v)}>{v.status}</Chip>{v.review && <div className="t-caption" style={{ color: 'var(--status-warning)' }}>Needs review</div>}</td>
                </tr>))}</tbody>
            </table></div>
          )}
      </div>
    </>
  )
}

function Row({ children }: { children: React.ReactNode }) { return <>{children}</> }
