import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, FileText, ShieldCheck, TriangleAlert, Phone, Mail, ClipboardList } from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { TODAY } from '../data/seed'
import { plansFor, reviewOverdue } from '../data/clients'
import { reviewState } from '../data/nursing'
import { Avatar, Button, CardHead, Chip, PageHead } from '../components/ui'
import { reviewTone } from './Staff'
import { docExpired } from '../components/CheckActions'

const daysAgo = (d: string) => Math.round((new Date(TODAY).getTime() - new Date(d).getTime()) / 86400000)

export default function Supervisors() {
  const s = useStore()
  const nav = useNavigate()
  const sups = s.users.filter(u => u.role === 'Care Supervisor' && u.status === 'Active' && s.inBranch(u.branch))
  const open = (branch: string, to: string) => { s.setBranch(branch); nav(to) }

  return (
    <>
      <PageHead title="Care Supervisors" crumb="Care Supervisors" sub="What each Care Supervisor has waiting. You can do any of their work yourself — open a list to step in." />
      <div className="grid g-2" style={{ alignItems: 'start' }}>
        {sups.map(u => {
          const inB = (b: string) => b === u.branch
          const visits = s.visits.filter(v => inB(v.branch) && v.approval === 'To review')
          const oldest = visits.map(v => v.date).sort()[0]
          const plans = s.clients.filter(c => inB(c.branch)).map(c => plansFor(c.id, s.carePlans))
          const waiting = plans.filter(p => p.working?.status === 'Awaiting review')
          const overdueReviews = plans.filter(p => !p.working && reviewOverdue(p.current))
          const incs = s.incidents.filter(i => i.owner === u.name && !['Resolved', 'Closed'].includes(i.status))
          const late = incs.filter(i => i.due < TODAY)
          const docs = s.documents.filter(d => inB(s.client(d.clientId)?.branch ?? '') && (d.status === 'Not checked' || docExpired(d)))
          const cks = s.checks.filter(k => inB(s.caregiver(k.caregiverId)?.branch ?? '') && ['To do', 'Waiting for check', 'Expired'].includes(k.status))
          const rv = s.reviews.find(r => r.personId === u.id)
          const behind = (oldest && daysAgo(oldest) > 5) || late.length > 0 || overdueReviews.length > 0
          const rows = [
            { icon: ClipboardCheck, label: 'Visits to approve', n: visits.length, note: oldest ? `oldest ${daysAgo(oldest)} day${daysAgo(oldest) === 1 ? '' : 's'} ago` : '', bad: !!oldest && daysAgo(oldest) > 5, to: '/approvals' },
            { icon: FileText, label: 'Care plans waiting', n: waiting.length, note: '', bad: false, to: '/care-plans' },
            { icon: ClipboardList, label: 'Care plan reviews overdue', n: overdueReviews.length, note: '', bad: overdueReviews.length > 0, to: '/care-plans?tab=reviews' },
            { icon: TriangleAlert, label: 'Incidents they own', n: incs.length, note: late.length ? `${late.length} past target date` : '', bad: late.length > 0, to: '/incidents' },
            { icon: ShieldCheck, label: 'Checks to do', n: docs.length + cks.length, note: `${docs.length} documents · ${cks.length} skills checks`, bad: false, to: '/checks' },
          ]
          return (
            <div key={u.id} className="card">
              <CardHead title={u.name} sub={`${s.branchName(u.branch)}`} action={<Chip tone={behind ? 'warning' : 'success'}>{behind ? 'Falling behind' : 'On track'}</Chip>} />
              <div className="card-body col" style={{ gap: 12 }}>
                <div className="row" style={{ gap: 12 }}><Avatar name={u.name} size="lg" /><div className="col" style={{ gap: 2 }}><span className="row t-small" style={{ gap: 6 }}><Phone size={13} />{u.phone}</span><span className="row t-small" style={{ gap: 6 }}><Mail size={13} />{u.email}</span></div></div>
                <div>{rows.map(r => (
                  <div key={r.label} className="list-row">
                    <r.icon size={16} color="var(--text-muted)" />
                    <div className="grow"><div className="t-small t-medium">{r.label}</div>{r.note && <div className="t-caption" style={{ color: r.bad ? 'var(--status-danger)' : 'var(--text-muted)' }}>{r.note}</div>}</div>
                    <b style={{ color: r.bad ? 'var(--status-danger)' : undefined }}>{r.n}</b>
                    <Button size="sm" variant="secondary" disabled={!r.n} onClick={() => open(u.branch, r.to)}>Open</Button>
                  </div>))}</div>
                {rv && <div className="row between t-small"><span>Their yearly review: due {fmtDate(rv.due, { day: 'numeric', month: 'short', year: 'numeric' })}</span><span className="row" style={{ gap: 8 }}><Chip tone={reviewTone(reviewState(rv))}>{reviewState(rv)}</Chip><button className="link-btn" onClick={() => nav('/staff')}>Reviews</button></span></div>}
              </div>
            </div>)
        })}
      </div>
      <div className="hint">“Falling behind” means visits waiting more than 5 days, incidents past their target date, or care plan reviews overdue. Opening a list switches the branch filter to their branch.</div>
    </>
  )
}
