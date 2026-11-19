import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, FileText, ShieldCheck, ChevronRight } from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { TODAY } from '../data/seed'
import { Button, Chip, EmptyState, PageHead, Tabs } from '../components/ui'
import { CgCheckModal, DocCheckModal, checkTone, docExpired, docTone, expiringSoon } from '../components/CheckActions'

type Tab = 'documents' | 'caregivers'
const SHOW = ['Needs you', 'Running out in 30 days', 'All'] as const
const long = (d?: string) => d ? fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function Checks() {
  const s = useStore()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'caregivers' ? 'caregivers' : 'documents'
  const [show, setShow] = useState<typeof SHOW[number]>('Needs you')
  const [doc, setDoc] = useState<string | null>(null)
  const [chk, setChk] = useState<string | null>(null)

  const docs = s.documents.filter(d => d.status !== 'Replaced' && s.inBranch(s.client(d.clientId)?.branch ?? ''))
  const docNeeds = (d: typeof docs[number]) => d.status === 'Not checked' || docExpired(d)
  const docRows = docs.filter(d => show === 'All' || (show === 'Needs you' ? docNeeds(d) : expiringSoon(d.expiry))).sort((a, b) => Number(docNeeds(b)) - Number(docNeeds(a)) || a.date.localeCompare(b.date))
  const cks = s.checks.filter(k => s.inBranch(s.caregiver(k.caregiverId)?.branch ?? ''))
  const ckNeeds = (k: typeof cks[number]) => ['To do', 'Waiting for check', 'Expired'].includes(k.status)
  const ckRows = cks.filter(k => show === 'All' || (show === 'Needs you' ? ckNeeds(k) : k.status === 'Checked' && expiringSoon(k.expiry))).sort((a, b) => Number(ckNeeds(b)) - Number(ckNeeds(a)) || (a.due ?? a.expiry ?? '').localeCompare(b.due ?? b.expiry ?? ''))

  return (
    <>
      <PageHead title="Checks" crumb="Checks" sub="Uploading something doesn’t mean it’s checked. The Care Supervisors usually do these; you can do any of them. HR checks the rest." />
      <div className="card">
        <div style={{ padding: '0 16px' }}><Tabs value={tab} onChange={t => setParams({ tab: t }, { replace: true })} tabs={[
          { id: 'documents', label: 'Client documents', count: docs.filter(docNeeds).length },
          { id: 'caregivers', label: 'Caregiver checks', count: cks.filter(ckNeeds).length },
        ]} /></div>
        <div className="toolbar">
          <div className="seg" role="group" aria-label="Show">{SHOW.map(o => <button key={o} className={show === o ? 'on' : ''} onClick={() => setShow(o)}>{o}</button>)}</div>
          <span className="grow" /><span className="t-caption t-muted">{tab === 'documents' ? docRows.length : ckRows.length} shown</span>
        </div>

        {tab === 'documents' && (docRows.length === 0 ? <EmptyState icon={CheckCircle2} title="Nothing to check" text={show === 'Needs you' ? 'Every client document is checked.' : 'Nothing runs out in the next 30 days.'} /> :
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Document</th><th>Client</th><th>Uploaded</th><th>Runs out</th><th>Status</th><th /></tr></thead>
            <tbody>{docRows.map(d => { const c = s.client(d.clientId)!; const exp = docExpired(d); return (
              <tr key={d.id}>
                <td><div className="t-medium row" style={{ gap: 6 }}><FileText size={14} />{d.name}</div><div className="t-caption t-muted">{d.category}</div>{d.reason && <div className="t-caption" style={{ color: d.status === 'Rejected' ? 'var(--status-danger)' : 'var(--text-muted)' }}>{d.reason}</div>}</td>
                <td><button className="link-btn" onClick={() => nav(`/clients/${c.id}?tab=documents`)}>{c.name}</button><div className="t-caption t-muted">{s.branchName(c.branch)}</div></td>
                <td>{long(d.date)}<div className="t-caption t-muted">{d.uploadedBy}</div></td>
                <td style={{ color: exp ? 'var(--status-danger)' : expiringSoon(d.expiry) ? 'var(--status-warning)' : undefined }}>{long(d.expiry)}</td>
                <td><Chip tone={exp ? 'danger' : docTone(d.status)}>{exp ? 'Expired' : d.status}</Chip>{exp && <div className="t-caption t-muted">New one needed from {c.coordinator}</div>}</td>
                <td style={{ textAlign: 'right' }}>{d.status === 'Not checked' ? <Button size="sm" icon={ShieldCheck} onClick={() => setDoc(d.id)}>Check</Button> : <Button size="sm" variant="secondary" onClick={() => setDoc(d.id)}>Change</Button>}</td>
              </tr>) })}</tbody>
          </table></div>)}

        {tab === 'caregivers' && (ckRows.length === 0 ? <EmptyState icon={CheckCircle2} title="Nothing to check" text={show === 'Needs you' ? 'Every check given to you is up to date.' : 'Nothing runs out in the next 30 days.'} /> :
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Check</th><th>Caregiver</th><th>Due or runs out</th><th>Status</th><th /></tr></thead>
            <tbody>{ckRows.map(k => { const g = s.caregiver(k.caregiverId)!; const date = k.status === 'Checked' || k.status === 'Expired' ? k.expiry : k.due; const late = !!date && date < TODAY && k.status !== 'Not needed'; return (
              <tr key={k.id}>
                <td><div className="t-medium">{k.name}</div><div className="t-caption t-muted">{k.why}</div>{k.evidence && ckNeeds(k) && <div className="t-caption" style={{ color: 'var(--status-info)' }}>{k.evidence}</div>}{k.reason && <div className="t-caption t-muted">{k.reason}</div>}</td>
                <td><button className="link-btn row" style={{ gap: 4 }} onClick={() => nav(`/caregivers/${g.id}?tab=checks&from=${encodeURIComponent('/checks?tab=caregivers')}`)}>{g.name}<ChevronRight size={13} /></button><div className="t-caption t-muted">{g.type} · {s.branchName(g.branch)}</div></td>
                <td style={{ color: late ? 'var(--status-danger)' : expiringSoon(date) ? 'var(--status-warning)' : undefined }}>{long(date)}{k.checkedBy && <div className="t-caption t-muted">Last checked by {k.checkedBy} · {long(k.checkedDate)}</div>}</td>
                <td><Chip tone={checkTone(k.status)}>{k.status}</Chip></td>
                <td style={{ textAlign: 'right' }}>{ckNeeds(k) ? <Button size="sm" icon={ShieldCheck} onClick={() => setChk(k.id)}>{k.status === 'Waiting for check' ? 'Check' : 'Record check'}</Button> : <Button size="sm" variant="secondary" onClick={() => setChk(k.id)}>Change</Button>}</td>
              </tr>) })}</tbody>
          </table></div>)}
      </div>
      {doc && s.documents.find(d => d.id === doc) && <DocCheckModal doc={s.documents.find(d => d.id === doc)!} onClose={() => setDoc(null)} />}
      {chk && s.checks.find(k => k.id === chk) && <CgCheckModal k={s.checks.find(k => k.id === chk)!} onClose={() => setChk(null)} />}
    </>
  )
}
