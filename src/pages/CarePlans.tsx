import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, CheckCircle2, ChevronRight } from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { CarePlan, TODAY } from '../data/seed'
import { plansFor, reviewDue, reviewOverdue } from '../data/clients'
import { Chip, EmptyState, PageHead, Tabs } from '../components/ui'
import { planTone } from './ClientDetail'

type Tab = 'waiting' | 'reviews' | 'coordinator' | 'approved'
const long = (d?: string) => d ? fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

/** Approved plan whose review is due, and nobody is already working on a new version. */
export const reviewNeeded = (current: CarePlan | undefined, working: CarePlan | undefined) => !!current && !working && reviewDue(current) && current.lastReview?.outcome !== 'Changes needed'

export default function CarePlans() {
  const s = useStore()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (['waiting', 'reviews', 'coordinator', 'approved'].includes(params.get('tab') ?? '') ? params.get('tab') : 'waiting') as Tab
  const [q, setQ] = useState('')
  const rows = useMemo(() => s.clients.filter(c => s.inBranch(c.branch) && c.status !== 'Discharged').map(c => ({ c, ...plansFor(c.id, s.carePlans) })), [s.clients, s.carePlans, s.branch])
  const lists: Record<Tab, { plan: CarePlan; c: typeof rows[number]['c']; note: string }[]> = {
    waiting: rows.filter(r => r.working?.status === 'Awaiting review').map(r => ({ plan: r.working!, c: r.c, note: `Sent ${long(r.working!.submittedDate)}${r.current ? ` · version ${r.current.version} in use until you approve` : ' · first plan — visits can’t start yet'}` })),
    reviews: rows.filter(r => reviewNeeded(r.current, r.working)).map(r => ({ plan: r.current!, c: r.c, note: `${reviewOverdue(r.current) ? 'Was due' : 'Due'} ${long(r.current!.reviewDate)}` })),
    coordinator: rows.filter(r => r.working?.status === 'Changes requested' || (r.current?.lastReview?.outcome === 'Changes needed' && !r.working)).map(r => r.working?.status === 'Changes requested'
      ? { plan: r.working, c: r.c, note: `You asked for changes: “${r.working.comments[r.working.comments.length - 1]?.text ?? ''}”` }
      : { plan: r.current!, c: r.c, note: `Review found changes needed: “${r.current!.lastReview!.note}”` }),
    approved: rows.filter(r => r.current).map(r => ({ plan: r.current!, c: r.c, note: `In use from ${long(r.current!.effectiveDate)} · review by ${long(r.current!.reviewDate)}` })),
  }
  const list = lists[tab].filter(x => !q.trim() || x.c.name.toLowerCase().includes(q.trim().toLowerCase()))
  const empty: Record<Tab, string> = { waiting: 'No care plans are waiting for approval.', reviews: 'No reviews are due in the next 2 weeks.', coordinator: 'Nothing is with the coordinators.', approved: 'No approved plans yet.' }

  return (
    <>
      <PageHead title="Care plans" crumb="Care plans" sub="Care Coordinators write the plans. Care Supervisors usually approve them — you can approve, send back with comments, or record a review yourself. Click a plan to open it." />
      <div className="card">
        <div style={{ padding: '0 16px' }}><Tabs value={tab} onChange={t => setParams({ tab: t }, { replace: true })} tabs={[
          { id: 'waiting', label: 'Waiting for approval', count: lists.waiting.length },
          { id: 'reviews', label: 'Reviews due', count: lists.reviews.length },
          { id: 'coordinator', label: 'With the coordinator', count: lists.coordinator.length },
          { id: 'approved', label: 'Approved', count: lists.approved.length },
        ]} /></div>
        <div className="toolbar"><div className="search"><FileText /><input aria-label="Search by client" placeholder="Search by client" value={q} onChange={e => setQ(e.target.value)} /></div></div>
        {list.length === 0 ? <EmptyState icon={CheckCircle2} title="Nothing here" text={empty[tab]} /> :
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Client</th><th>Version</th><th>Coordinator</th><th>Branch</th><th>Status</th><th style={{ width: 30 }} /></tr></thead>
            <tbody>{list.map(({ plan, c, note }) => (
              <tr key={plan.id} className="clickable" onClick={() => nav(`/care-plans/${plan.id}?from=${encodeURIComponent(`/care-plans?tab=${tab}`)}`)}>
                <td><div className="t-medium">{c.name}</div><div className="t-caption t-muted" style={{ maxWidth: 520 }}>{note}</div></td>
                <td>Version {plan.version}</td><td>{plan.createdBy}</td><td>{s.branchName(c.branch)}</td>
                <td><Chip tone={tab === 'reviews' ? (plan.reviewDate < TODAY ? 'danger' : 'warning') : planTone(plan.status)}>{tab === 'reviews' ? (plan.reviewDate < TODAY ? 'Review overdue' : 'Review due') : plan.status}</Chip></td>
                <td><ChevronRight size={16} color="var(--text-muted)" /></td>
              </tr>))}</tbody>
          </table></div>}
      </div>
    </>
  )
}
