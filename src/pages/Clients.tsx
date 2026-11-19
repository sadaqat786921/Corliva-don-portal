import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Home, ChevronRight } from 'lucide-react'
import { useStore } from '../data/store'
import { CarePlan, Client } from '../data/seed'
import { plansFor, reviewDue, reviewOverdue } from '../data/clients'
import { Avatar, Button, Chip, ChipTone, EmptyState, PageHead, Pager, usePaged } from '../components/ui'

const stTone = (s: Client['status']): ChipTone => s === 'Active' ? 'success' : s === 'On hold' ? 'warning' : 'neutral'
export function planLabel(current?: CarePlan, working?: CarePlan): { text: string; tone: ChipTone } {
  if (working?.status === 'Awaiting review') return { text: current ? 'New version waiting for approval' : 'Waiting for approval', tone: 'info' }
  if (working?.status === 'Changes requested') return { text: 'Sent back for changes', tone: 'warning' }
  if (working?.status === 'Draft' && !current) return { text: 'Draft — not sent yet', tone: 'neutral' }
  if (!current) return { text: 'No care plan', tone: 'danger' }
  if (reviewOverdue(current)) return { text: 'Review overdue', tone: 'danger' }
  if (reviewDue(current)) return { text: 'Review due soon', tone: 'warning' }
  return { text: 'Approved', tone: 'success' }
}
const SHOW = ['Everyone', 'Care plan needs you', 'Documents to check', 'Visits to review']

export default function Clients() {
  const s = useStore()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('Active')
  const [show, setShow] = useState('Everyone')

  const rows = useMemo(() => s.clients.filter(c => s.inBranch(c.branch)).map(c => {
    const p = plansFor(c.id, s.carePlans)
    const docs = s.documents.filter(d => d.clientId === c.id && d.status === 'Not checked').length
    const visits = s.visits.filter(v => v.clientId === c.id && v.approval === 'To review').length
    const planNeedsMe = p.working?.status === 'Awaiting review' || (!p.working && reviewOverdue(p.current))
    return { c, plan: planLabel(p.current, p.working), docs, visits, planNeedsMe }
  }).filter(x =>
    (status === 'All statuses' || x.c.status === status) &&
    (show === 'Everyone' || (show === SHOW[1] ? x.planNeedsMe : show === SHOW[2] ? x.docs > 0 : x.visits > 0)) &&
    (!q.trim() || x.c.name.toLowerCase().includes(q.trim().toLowerCase()))), [s.clients, s.carePlans, s.documents, s.visits, s.branch, status, show, q])
  const pg = usePaged(rows, 10)

  const legacy = params.get('open')
  if (legacy) return <Navigate to={`/clients/${legacy}`} replace />

  return (
    <>
      <PageHead title="Clients" crumb="Clients" sub={`Clients in ${s.branchName(s.branch)}. Care Coordinators keep the details and visits; Care Supervisors and you approve care plans, check documents and review finished visits. Risk levels and health updates are in Clients’ health.`} />
      <div className="card">
        <div className="toolbar">
          <div className="search"><Search /><input aria-label="Search clients" placeholder="Search by name" value={q} onChange={e => { setQ(e.target.value); pg.setPage(1) }} /></div>
          <select className="select-sm" aria-label="Status" value={status} onChange={e => setStatus(e.target.value)}>{['Active', 'On hold', 'Discharged', 'All statuses'].map(o => <option key={o}>{o}</option>)}</select>
          <select className="select-sm" aria-label="Show" value={show} onChange={e => setShow(e.target.value)}>{SHOW.map(o => <option key={o}>{o}</option>)}</select>
          <span className="grow" /><span className="t-caption t-muted">{rows.length} client{rows.length === 1 ? '' : 's'}</span>
        </div>
        {rows.length === 0 ? <EmptyState icon={Home} tone="neutral" title="No clients match" text="Try another name or change the filters." action={<Button variant="secondary" onClick={() => { setQ(''); setStatus('All statuses'); setShow('Everyone') }}>Clear filters</Button>} /> : <>
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Client</th><th>Branch</th><th>Coordinator</th><th>Care plan</th><th>Documents</th><th>Visits to review</th><th>Status</th><th style={{ width: 30 }} /></tr></thead>
            <tbody>{pg.slice.map(({ c, plan, docs, visits }) => (
              <tr key={c.id} className="clickable" onClick={() => nav(`/clients/${c.id}`)}>
                <td><span className="row"><Avatar name={c.name} /><span><span className="t-medium" style={{ display: 'block' }}>{c.name}</span><span className="t-caption t-muted">{c.services}</span></span></span></td>
                <td>{s.branchName(c.branch)}</td><td>{c.coordinator}</td>
                <td><Chip tone={plan.tone}>{plan.text}</Chip></td>
                <td>{docs ? <Chip tone="warning">{docs} to check</Chip> : <span className="t-small t-muted">All checked</span>}</td>
                <td>{visits ? <Chip tone="warning">{visits}</Chip> : <span className="t-small t-muted">None</span>}</td>
                <td><Chip tone={stTone(c.status)}>{c.status}</Chip></td>
                <td><ChevronRight size={16} color="var(--text-muted)" /></td>
              </tr>))}</tbody>
          </table></div>
          <Pager {...pg} onPage={pg.setPage} />
        </>}
      </div>
    </>
  )
}
