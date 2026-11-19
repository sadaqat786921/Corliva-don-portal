import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Lock, Users, ChevronRight } from 'lucide-react'
import { useStore } from '../data/store'
import { Caregiver, TODAY } from '../data/seed'
import { DAY_NAMES, weekHours } from '../data/schedule'
import { Avatar, Chip, ChipTone, EmptyState, PageHead } from '../components/ui'

const rTone = (r: Caregiver['readiness']): ChipTone => r === 'Ready' ? 'success' : r === 'Warning' ? 'warning' : 'danger'
const rText = (r: Caregiver['readiness']) => r === 'Blocked' ? 'Not ready' : r === 'Warning' ? 'Ready with warning' : 'Ready'

export default function Caregivers() {
  const s = useStore()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [q, setQ] = useState('')
  const [skill, setSkill] = useState('Any service')
  const [ready, setReady] = useState('Everyone')
  const rows = useMemo(() => s.caregivers.filter(g => s.inBranch(g.branch) && (skill === 'Any service' || g.skills.includes(skill)) &&
    (ready === 'Everyone' || (ready === 'Ready to work' ? g.readiness !== 'Blocked' : g.readiness === 'Blocked')) &&
    (!q.trim() || g.name.toLowerCase().includes(q.trim().toLowerCase()))), [s.caregivers, s.branch, skill, ready, q])
  const legacy = params.get('open')
  if (legacy) return <Navigate to={`/caregivers/${legacy}`} replace />

  return (
    <>
      <PageHead title="Caregivers" crumb="Caregivers" sub={`Caregivers in ${s.branchName(s.branch)}: what they’re trained for, when they’re free and their skills checks. Click a caregiver to see their profile.`} />
      <div className="row t-small" style={{ gap: 10, padding: '10px 14px', background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
        <Lock size={16} color="var(--text-muted)" /><span>Caregiver records and documents are kept by the HR Officer. You record skills checks and spot checks. Pay rates are not shown here.</span>
      </div>
      <div className="card">
        <div className="toolbar">
          <div className="search"><Search /><input aria-label="Search caregivers" placeholder="Search by name" value={q} onChange={e => setQ(e.target.value)} /></div>
          <select className="select-sm" aria-label="Trained for" value={skill} onChange={e => setSkill(e.target.value)}>{['Any service', ...s.lists.services.filter(x => x.active).map(x => x.name)].map(o => <option key={o}>{o}</option>)}</select>
          <select className="select-sm" aria-label="Readiness" value={ready} onChange={e => setReady(e.target.value)}>{['Everyone', 'Ready to work', 'Not ready'].map(o => <option key={o}>{o}</option>)}</select>
          <span className="grow" /><span className="t-caption t-muted">{rows.length} caregiver{rows.length === 1 ? '' : 's'}</span>
        </div>
        {rows.length === 0 ? <EmptyState icon={Users} tone="neutral" title="No caregivers match" text="Try changing the filters." /> :
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Caregiver</th><th>Type</th><th>Trained for</th><th>Usually works</th><th>This week</th><th>Your checks</th><th>Status</th><th style={{ width: 30 }} /></tr></thead>
            <tbody>{rows.map(g => { const h = weekHours(g.id, TODAY, s.visits); return (
              <tr key={g.id} className="clickable" onClick={() => nav(`/caregivers/${g.id}`)}>
                <td><span className="row"><Avatar name={g.name} /><span><span className="t-medium" style={{ display: 'block', whiteSpace: 'nowrap' }}>{g.name}</span><span className="t-caption t-muted">{g.phone}</span></span></span></td>
                <td>{g.type}</td><td>{g.skills.join(', ')}</td>
                <td>{g.days.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => DAY_NAMES[d]).join(', ')}<div className="t-caption t-muted">{g.from}–{g.to}</div></td>
                <td><div className="bar" style={{ width: 90 }}><span style={{ width: `${Math.min(100, h / g.maxHours * 100)}%`, background: h > g.maxHours ? 'var(--status-danger)' : 'var(--action-primary)' }} /></div><span className="t-caption t-muted">{h} of {g.maxHours} hrs</span></td>
                <td>{(() => { const n = s.checks.filter(k => k.caregiverId === g.id && ['To do', 'Waiting for check', 'Expired'].includes(k.status)).length; return n ? <Chip tone="warning">{n} to do</Chip> : <span className="t-small t-muted">Up to date</span> })()}</td>
                <td><Chip tone={rTone(g.readiness)}>{rText(g.readiness)}</Chip>{g.issue && <div className="t-caption t-muted">{g.issue}</div>}</td>
                <td><ChevronRight size={16} color="var(--text-muted)" /></td>
              </tr>) })}</tbody>
          </table></div>}
      </div>
    </>
  )
}
