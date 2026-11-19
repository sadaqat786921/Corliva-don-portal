import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CheckCircle2, Lock, TriangleAlert, ChevronRight } from 'lucide-react'
import { useStore, fmtDate, stampNow } from '../data/store'
import { Incident, IncidentStatus, TODAY, addDays } from '../data/seed'
import { AlertBanner, Button, Chip, ChipTone, EmptyState, Field, Input, Modal, PageHead, Select, Tabs, Textarea } from '../components/ui'

export const sevTone = (s: Incident['severity']): ChipTone => s === 'High' ? 'danger' : s === 'Medium' ? 'warning' : 'neutral'
export const stTone = (s: IncidentStatus): ChipTone => s === 'Resolved' || s === 'Closed' ? 'success' : s === 'Action required' ? 'danger' : s === 'Under review' ? 'warning' : 'info'
export const stamp = stampNow

export default function Incidents() {
  const s = useStore()
  const [tab, setTab] = useState<'open' | 'high' | 'Resolved' | 'Closed'>('open')
  const nav = useNavigate()
  const [report, setReport] = useState(false)
  const isOpen = (i: Incident) => !['Resolved', 'Closed'].includes(i.status)
  const visible = (i: Incident) => s.inBranch(i.branch)
  const rows = useMemo(() => s.incidents.filter(i => visible(i) && (tab === 'open' ? isOpen(i) : tab === 'high' ? isOpen(i) && i.severity === 'High' : i.status === tab)), [s.incidents, s.branch, tab])
  const n = (f: (i: Incident) => boolean) => s.incidents.filter(i => visible(i) && f(i)).length

  return (
    <>
      <PageHead title="Incidents" crumb="Incidents" sub="Care Supervisors own most incidents. High severity ones are sent up to you — you can take any incident over. Click one to open it. Private incidents are only shown to approved roles." actions={<Button icon={Plus} onClick={() => setReport(true)}>Report an incident</Button>} />
      <div className="card">
        <div style={{ padding: '0 16px' }}><Tabs value={tab} onChange={setTab} tabs={[{ id: 'open', label: 'Open', count: n(isOpen) }, { id: 'high', label: 'High severity — sent to you', count: n(i => isOpen(i) && i.severity === 'High') }, { id: 'Resolved', label: 'Resolved', count: n(i => i.status === 'Resolved') }, { id: 'Closed', label: 'Closed', count: n(i => i.status === 'Closed') }]} /></div>
        {rows.length === 0 ? <EmptyState icon={CheckCircle2} title={tab === 'open' ? 'No open incidents' : 'Nothing here'} text={tab === 'open' ? 'Nothing needs attention right now.' : 'Incidents appear here as they move along.'} />
          : <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Incident</th><th>Type</th><th>Severity</th><th>Client</th><th>Owner</th><th>Target date</th><th>Status</th><th style={{ width: 30 }} /></tr></thead>
            <tbody>{rows.map(i => (
              <tr key={i.id} className="clickable" onClick={() => nav(`/incidents/${i.id}`)}>
                <td><div className="t-medium row" style={{ gap: 6 }}>{i.sensitive && <Lock size={13} />}{i.title}</div><div className="t-caption t-muted">{i.id} · reported {fmtDate(i.date)} by {i.reportedBy}</div></td>
                <td>{i.category}</td><td><Chip tone={sevTone(i.severity)}>{i.severity}</Chip></td><td>{i.client}<div className="t-caption t-muted">{s.branchName(i.branch)}</div></td><td>{i.owner === s.me.name ? 'You' : i.owner}</td>
                <td style={{ color: isOpen(i) && i.due < TODAY ? 'var(--status-danger)' : undefined, fontWeight: isOpen(i) && i.due < TODAY ? 600 : 400 }}>{i.due === TODAY ? 'Today' : fmtDate(i.due)}</td>
                <td><Chip tone={stTone(i.status)}>{i.status}</Chip></td>
                <td><ChevronRight size={16} color="var(--text-muted)" /></td>
              </tr>))}</tbody>
          </table></div>}
      </div>
      {report && <ReportModal onClose={() => setReport(false)} onDone={id => { setReport(false); nav(`/incidents/${id}`) }} />}
    </>
  )
}

function ReportModal({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const s = useStore()
  const cats = s.lists.incidents.filter(x => x.active)
  const clients = s.clients.filter(c => c.status !== 'Discharged' && s.inBranch(c.branch))
  const cgs = s.caregivers.filter(g => s.inBranch(g.branch))
  const [f, setF] = useState({ title: '', category: cats[0]?.name ?? '', severity: 'Medium' as Incident['severity'], client: clients[0]?.id ?? '', caregiver: '', date: TODAY, text: '' })
  const [tried, setTried] = useState(false)
  const errs = { title: !f.title.trim(), text: f.text.trim().length < 10 }
  const save = () => {
    setTried(true); if (errs.title || errs.text) return
    const c = s.clients.find(x => x.id === f.client)!
    const owner = s.users.find(u => u.role === 'Care Supervisor' && u.status === 'Active' && u.branch === c.branch)?.name ?? s.me.name
    const id = 'INC-' + (Math.max(...s.incidents.map(x => Number(x.id.slice(4)) || 0)) + 1)
    s.setIncidents(x => [{ id, title: f.title.trim(), category: f.category, severity: f.severity, client: c.name, caregiver: f.caregiver || undefined, reportedBy: s.me.name, date: f.date, owner, due: addDays(f.severity === 'High' ? 1 : 3), status: 'Reported', branch: c.branch, sensitive: f.category === 'Safeguarding concern', notes: [{ by: s.me.name, at: stamp(), text: f.text.trim() }], findings: '', actions: [] }, ...x])
    s.log({ type: 'Incident', action: 'Reported an incident', record: `${id} ${f.title.trim()}`, after: `${f.severity} · owner ${owner}` })
    s.toast(owner === s.me.name ? `Incident ${id} reported. You are the owner.` : `Incident ${id} reported. ${owner} (Care Supervisor) owns it.`); onDone(id)
  }
  return (
    <Modal wide title="Report an incident" sub="Write what happened in plain words. You can add more notes later." onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Report incident</Button></>}>
      <Field label="Short title" required error={tried && errs.title ? 'Please add a short title.' : undefined}><Input autoFocus value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="For example: Client felt dizzy during visit" error={tried && errs.title} /></Field>
      <div className="grid g-3">
        <Field label="Type" required><Select value={f.category} onChange={e => setF({ ...f, category: e.target.value })} options={cats.map(c => c.name)} /></Field>
        <Field label="Severity" required><Select value={f.severity} onChange={e => setF({ ...f, severity: e.target.value as Incident['severity'] })} options={['Low', 'Medium', 'High']} /></Field>
        <Field label="When did it happen?" required><Input type="date" max={TODAY} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
      </div>
      <div className="grid g-2">
        <Field label="Client" required><Select value={f.client} onChange={e => setF({ ...f, client: e.target.value })} options={clients.map(c => ({ value: c.id, label: c.name }))} /></Field>
        <Field label="Caregiver involved" helper="Optional."><Select value={f.caregiver} onChange={e => setF({ ...f, caregiver: e.target.value })} options={[{ value: '', label: 'None' }, ...cgs.map(g => ({ value: g.name, label: g.name }))]} /></Field>
      </div>
      <Field label="What happened?" required error={tried && errs.text ? 'Please describe what happened (a sentence or two).' : undefined}><Textarea value={f.text} onChange={e => setF({ ...f, text: e.target.value })} error={tried && errs.text} /></Field>
      {f.severity === 'High' && <AlertBanner tone="warning" title="High severity"><span className="row" style={{ gap: 6 }}><TriangleAlert size={14} />If someone is in danger, call 911 first.</span></AlertBanner>}
      <div className="hint">The Care Supervisor for the client’s branch owns it. The client’s coordinator is told.</div>
      {f.category === 'Safeguarding concern' && <AlertBanner tone="info" title="This will be private">Only approved roles will be able to see it.</AlertBanner>}
    </Modal>
  )
}
