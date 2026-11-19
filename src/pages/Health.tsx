import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeartPulse, Search, ChevronRight, AlertTriangle, Hospital, CalendarClock } from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { RiskLevel, TODAY } from '../data/seed'
import { plansFor, reviewOverdue } from '../data/clients'
import { checkInDue, lastHealth, supervisorOf } from '../data/nursing'
import { Avatar, Button, Chip, EmptyState, PageHead, StatTile } from '../components/ui'
import { riskTone } from './ClientDetail'

const ORDER: Record<RiskLevel, number> = { High: 0, Medium: 1, Low: 2 }
const short = (d: string) => d === TODAY ? 'Today' : fmtDate(d, { day: 'numeric', month: 'short' })

export default function Health() {
  const s = useStore()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [level, setLevel] = useState('All levels')
  const rows = useMemo(() => s.clients.filter(c => s.inBranch(c.branch) && c.status !== 'Discharged').map(c => {
    const open = s.incidents.filter(i => i.client === c.name && !['Resolved', 'Closed'].includes(i.status)).length
    const plan = plansFor(c.id, s.carePlans).current
    return { c, last: lastHealth(c), due: checkInDue(c), open, plan, sup: supervisorOf(c.branch, s.users)?.name ?? '—' }
  }).filter(x => (level === 'All levels' || (level === 'Update due' ? x.due : x.c.risk?.level === level)) && (!q.trim() || x.c.name.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => Number(b.due) - Number(a.due) || ORDER[a.c.risk?.level ?? 'Low'] - ORDER[b.c.risk?.level ?? 'Low'] || a.c.name.localeCompare(b.c.name)),
  [s.clients, s.incidents, s.carePlans, s.branch, level, q])
  const all = s.clients.filter(c => s.inBranch(c.branch) && c.status !== 'Discharged')
  const hospital = all.filter(c => c.status === 'On hold' || lastHealth(c)?.type === 'Hospital stay').length

  return (
    <>
      <PageHead title="Clients’ health" crumb="Clients’ health" sub={`Every client in ${s.branchName(s.branch)}, highest risk first. Click a client to see their health updates and add one.`} />
      <div className="grid g-4">
        <StatTile icon={AlertTriangle} tone="danger" label="High risk" value={all.filter(c => c.risk?.level === 'High').length} foot={`${all.filter(checkInDue).length} need a health update`} onClick={() => setLevel('High')} />
        <StatTile icon={HeartPulse} tone="warning" label="Medium risk" value={all.filter(c => c.risk?.level === 'Medium').length} foot="Watched at the usual reviews" onClick={() => setLevel('Medium')} />
        <StatTile icon={Hospital} tone="info" label="In hospital or on hold" value={hospital} foot="Care paused" />
        <StatTile icon={CalendarClock} tone="neutral" label="Care plan reviews overdue" value={all.filter(c => reviewOverdue(plansFor(c.id, s.carePlans).current)).length} foot="Care Supervisors record these" onClick={() => nav('/care-plans?tab=reviews')} />
      </div>
      <div className="card">
        <div className="toolbar">
          <div className="search"><Search /><input aria-label="Search clients" placeholder="Search by name" value={q} onChange={e => setQ(e.target.value)} /></div>
          <select className="select-sm" aria-label="Risk level" value={level} onChange={e => setLevel(e.target.value)}>{['All levels', 'Update due', 'High', 'Medium', 'Low'].map(o => <option key={o}>{o}</option>)}</select>
          <span className="grow" /><span className="t-caption t-muted">{rows.length} client{rows.length === 1 ? '' : 's'}</span>
        </div>
        {rows.length === 0 ? <EmptyState icon={HeartPulse} tone="neutral" title="No clients match" text="Change the filter or search." action={<Button variant="secondary" onClick={() => { setQ(''); setLevel('All levels') }}>Clear filters</Button>} /> :
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Client</th><th>Risk</th><th>Last health update</th><th>Open incidents</th><th>Care plan review</th><th>Care Supervisor</th><th style={{ width: 30 }} /></tr></thead>
            <tbody>{rows.map(({ c, last, due, open, plan, sup }) => (
              <tr key={c.id} className="clickable" onClick={() => nav(`/clients/${c.id}?tab=health`)}>
                <td><span className="row"><Avatar name={c.name} /><span><span className="t-medium" style={{ display: 'block' }}>{c.name}</span><span className="t-caption t-muted">{c.status === 'On hold' ? 'Care on hold · ' : ''}{s.branchName(c.branch)}</span></span></span></td>
                <td>{c.risk ? <><Chip tone={riskTone(c.risk.level)}>{c.risk.level}</Chip><div className="t-caption t-muted" style={{ maxWidth: 260 }}>{c.risk.why}</div></> : <Chip tone="neutral">Not set</Chip>}</td>
                <td>{last ? <>{short(last.date)}<div className="t-caption t-muted">{last.type}</div></> : <span className="t-muted">None</span>}{due && <div><Chip tone="warning">Update due</Chip></div>}</td>
                <td>{open ? <Chip tone="danger">{open} open</Chip> : <span className="t-small t-muted">None</span>}</td>
                <td style={{ color: reviewOverdue(plan) ? 'var(--status-danger)' : undefined }}>{plan ? short(plan.reviewDate) : '—'}{reviewOverdue(plan) && <div className="t-caption">Overdue</div>}</td>
                <td>{sup}</td>
                <td><ChevronRight size={16} color="var(--text-muted)" /></td>
              </tr>))}</tbody>
          </table></div>}
      </div>
    </>
  )
}
