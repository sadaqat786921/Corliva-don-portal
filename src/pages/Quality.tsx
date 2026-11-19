import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TriangleAlert, Footprints, Pill, CalendarX, Clock, ChevronRight, Lock } from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { TODAY, addDays, branches } from '../data/seed'
import { plansFor, reviewOverdue } from '../data/clients'
import { mins } from '../data/review'
import { reviewState, staffPeople } from '../data/nursing'
import { CardHead, Chip, PageHead, StatTile } from '../components/ui'
import { docExpired } from '../components/CheckActions'
import { sevTone, stTone } from './Incidents'

const short = (d: string) => fmtDate(d, { day: 'numeric', month: 'short' })

export default function Quality() {
  const s = useStore()
  const nav = useNavigate()
  const [days, setDays] = useState(90)
  const from = addDays(-days)
  const inc = s.incidents.filter(i => s.inBranch(i.branch) && i.date >= from)
  const finished = s.visits.filter(v => s.inBranch(v.branch) && v.date >= from && v.date <= TODAY && v.checkIn)
  const onTime = finished.filter(v => mins(v.checkIn!) - mins(v.start) <= s.rules.lateArrivalMins).length
  const pct = finished.length ? Math.round(onTime / finished.length * 100) : 100
  const missed = s.visits.filter(v => s.inBranch(v.branch) && v.date >= from && v.date <= TODAY && v.status === 'Cancelled' && v.cancelReason === 'No caregiver available').length + inc.filter(i => i.category === 'Missed visit').length
  const types = Array.from(new Set(inc.map(i => i.category))).map(t => ({ t, n: inc.filter(i => i.category === t).length })).sort((a, b) => b.n - a.n)
  const maxN = Math.max(1, ...types.map(x => x.n))
  const actions = s.incidents.filter(i => s.inBranch(i.branch) && !['Closed'].includes(i.status)).flatMap(i => i.actions.filter(a => !a.done).map(a => ({ i, a }))).sort((x, y) => x.a.due.localeCompare(y.a.due))
  const high = s.incidents.filter(i => s.inBranch(i.branch) && i.severity === 'High' && i.date >= from).sort((a, b) => b.date.localeCompare(a.date))
  const staff = staffPeople(s.caregivers, s.users)

  const byBranch = branches.filter(b => s.inBranch(b.id)).map(b => {
    const bi = inc.filter(i => i.branch === b.id)
    const fv = finished.filter(v => v.branch === b.id)
    const ot = fv.length ? Math.round(fv.filter(v => mins(v.checkIn!) - mins(v.start) <= s.rules.lateArrivalMins).length / fv.length * 100) : 100
    return {
      b, incidents: bi.length, high: bi.filter(i => i.severity === 'High').length, falls: bi.filter(i => i.category === 'Fall').length, ot,
      reviews: s.clients.filter(c => c.branch === b.id && c.status !== 'Discharged').filter(c => { const p = plansFor(c.id, s.carePlans); return !p.working && reviewOverdue(p.current) }).length,
      checks: s.documents.filter(d => s.client(d.clientId)?.branch === b.id && (d.status === 'Not checked' || docExpired(d))).length + s.checks.filter(k => s.caregiver(k.caregiverId)?.branch === b.id && ['To do', 'Waiting for check', 'Expired'].includes(k.status)).length,
      staffReviews: s.reviews.filter(r => reviewState(r) === 'Overdue' && staff.find(p => p.id === r.personId)?.branch === b.id).length,
    }
  })

  return (
    <>
      <PageHead title="Quality and risk" crumb="Quality and risk" sub={`How safe and reliable care is in ${s.branchName(s.branch)}. Click any incident or action to open it.`} actions={
        <div className="seg" role="group" aria-label="Period">{[30, 90].map(d => <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>Last {d} days</button>)}</div>} />
      <div className="grid g-4">
        <StatTile icon={TriangleAlert} tone="danger" label="Incidents reported" value={inc.length} foot={`${inc.filter(i => i.severity === 'High').length} high severity`} onClick={() => nav('/incidents')} />
        <StatTile icon={Footprints} tone="warning" label="Falls" value={inc.filter(i => i.category === 'Fall').length} foot="Reported as incidents" />
        <StatTile icon={Pill} tone="warning" label="Medication concerns" value={inc.filter(i => i.category === 'Medication concern').length} foot="Reported as incidents" />
        <StatTile icon={CalendarX} tone="danger" label="Missed visits" value={missed} foot="No caregiver, or reported as missed" />
      </div>

      <div className="grid g-main-side" style={{ alignItems: 'start' }}>
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <CardHead title="Incidents by type" sub={`Last ${days} days.`} />
            <div className="card-body col" style={{ gap: 10 }}>
              {types.length === 0 ? <div className="t-small t-muted">No incidents.</div> : types.map(x => (
                <div key={x.t} className="col" style={{ gap: 4 }}><div className="row between t-small"><span>{x.t}</span><b>{x.n}</b></div><div className="bar"><span style={{ width: `${x.n / maxN * 100}%`, background: 'var(--action-primary)' }} /></div></div>))}
            </div>
          </div>
          <div className="card">
            <CardHead title="Branches side by side" sub="Red means something needs attention." />
            <div className="table-wrap"><table className="tbl">
              <thead><tr><th>Branch</th><th>Incidents</th><th>High</th><th>Falls</th><th>On time</th><th>Plan reviews late</th><th>Checks to do</th><th>Staff reviews late</th></tr></thead>
              <tbody>{byBranch.map(r => (
                <tr key={r.b.id}><td className="t-medium">{r.b.name}</td><td>{r.incidents}</td><td style={{ color: r.high ? 'var(--status-danger)' : undefined }}>{r.high}</td><td>{r.falls}</td>
                  <td style={{ color: r.ot < 90 ? 'var(--status-danger)' : undefined }}>{r.ot}%</td><td style={{ color: r.reviews ? 'var(--status-danger)' : undefined }}>{r.reviews}</td><td>{r.checks}</td><td style={{ color: r.staffReviews ? 'var(--status-danger)' : undefined }}>{r.staffReviews}</td></tr>))}</tbody>
            </table></div>
          </div>
          <div className="card">
            <CardHead title="Actions still to do" sub="From every open incident. Late ones first." />
            <div className="card-body">
              {actions.length === 0 ? <div className="t-small t-muted">Every action is done.</div> : actions.map(({ i, a }) => (
                <button key={a.id} className="list-row clickable-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/incidents/${i.id}?from=/quality`)}>
                  <div className="grow"><div className="t-small t-medium">{a.text}</div><div className="t-caption t-muted">{a.who} · by {short(a.due)} · {i.id} {i.title}</div></div>
                  <Chip tone={a.due < TODAY ? 'danger' : 'warning'}>{a.due < TODAY ? 'Late' : 'To do'}</Chip><ChevronRight size={16} color="var(--text-muted)" />
                </button>))}
            </div>
          </div>
        </div>
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <CardHead title="Visits started on time" sub={`Checked in within ${s.rules.lateArrivalMins} minutes of the start.`} />
            <div className="card-body col" style={{ gap: 8 }}>
              <div className="row" style={{ gap: 8 }}><Clock size={18} color="var(--text-muted)" /><span className="t-h2">{pct}%</span><Chip tone={pct >= 90 ? 'success' : 'warning'}>{pct >= 90 ? 'Good' : 'Below 90%'}</Chip></div>
              <div className="bar"><span style={{ width: `${pct}%`, background: pct >= 90 ? 'var(--status-success)' : 'var(--status-warning)' }} /></div>
              <div className="t-caption t-muted">{onTime} of {finished.length} visits with a check-in.</div>
            </div>
          </div>
          <div className="card">
            <CardHead title="High severity incidents" sub={`Last ${days} days.`} />
            <div className="card-body">{high.length === 0 ? <div className="t-small t-muted">None.</div> : high.map(i => (
              <button key={i.id} className="list-row clickable-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/incidents/${i.id}?from=/quality`)}>
                {i.sensitive ? <Lock size={15} color="var(--text-muted)" /> : <TriangleAlert size={15} color="var(--status-danger)" />}
                <div className="grow"><div className="t-small t-medium">{i.title}</div><div className="t-caption t-muted">{i.client} · {short(i.date)} · {i.owner}</div></div>
                <Chip tone={stTone(i.status)}>{i.status}</Chip>
              </button>))}</div>
          </div>
          <div className="card">
            <CardHead title="Severity" />
            <div className="card-body col" style={{ gap: 8 }}>{(['High', 'Medium', 'Low'] as const).map(l => <div key={l} className="row between"><Chip tone={sevTone(l)}>{l}</Chip><b>{inc.filter(i => i.severity === l).length}</b></div>)}</div>
          </div>
        </div>
      </div>
    </>
  )
}
