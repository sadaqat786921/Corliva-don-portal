import { useState } from 'react'
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { CgCheck, CheckStatus, ClientDoc, DocStatus, TODAY, addDays } from '../data/seed'
import { AlertBanner, Button, ChipTone, Field, Input, Modal, Textarea } from './ui'

export const docTone = (s: DocStatus): ChipTone => s === 'Checked' ? 'success' : s === 'Rejected' ? 'danger' : s === 'Not checked' ? 'warning' : 'neutral'
export const checkTone = (s: CheckStatus): ChipTone => s === 'Checked' ? 'success' : s === 'Rejected' || s === 'Expired' ? 'danger' : s === 'Waiting for check' || s === 'To do' ? 'warning' : 'neutral'
/** A checked document whose expiry date has passed counts as expired. */
export const docExpired = (d: ClientDoc) => !!d.expiry && d.expiry < TODAY && d.status === 'Checked'
export const expiringSoon = (expiry?: string) => !!expiry && expiry >= TODAY && expiry <= addDays(30)

type Outcome = 'ok' | 'reject' | 'na'
const OUT: { id: Outcome; label: string; icon: typeof CheckCircle2; help: string }[] = [
  { id: 'ok', label: 'It’s right — mark as checked', icon: CheckCircle2, help: 'You looked at it and it is correct and readable.' },
  { id: 'reject', label: 'Something is wrong — reject it', icon: XCircle, help: 'The coordinator or HR is told what to fix. The file is kept.' },
  { id: 'na', label: 'Not needed for this person', icon: MinusCircle, help: 'Only when the rule doesn’t apply to them. Needs a reason.' },
]

/** Check a client document: checked, rejected (reason) or not needed (reason). Nothing is deleted. */
export function DocCheckModal({ doc, onClose }: { doc: ClientDoc; onClose: () => void }) {
  const s = useStore()
  const c = s.client(doc.clientId)
  const [o, setO] = useState<Outcome>('ok')
  const [reason, setReason] = useState('')
  const [tried, setTried] = useState(false)
  const bad = o !== 'ok' && reason.trim().length < 5
  const save = () => {
    setTried(true); if (bad) return
    const status: DocStatus = o === 'ok' ? 'Checked' : o === 'reject' ? 'Rejected' : 'Not needed'
    s.setDocuments(x => x.map(d => d.id === doc.id ? { ...d, status, checkedBy: s.me.name, checkedDate: TODAY, reason: o === 'ok' ? undefined : reason.trim() } : d))
    s.clientNote(doc.clientId, `Document “${doc.name}” ${status === 'Checked' ? 'checked' : status === 'Rejected' ? `rejected: ${reason.trim()}` : `marked not needed: ${reason.trim()}`}.`)
    s.log({ type: 'Document', action: `Document ${status.toLowerCase()}`, record: `${c?.name} · ${doc.name}`, before: doc.status, after: status, reason: o === 'ok' ? undefined : reason.trim() })
    s.toast(status === 'Rejected' ? `Rejected. ${c?.coordinator} has been told what to fix.` : `${doc.name} is ${status.toLowerCase()}.`)
    onClose()
  }
  return (
    <Modal title={`Check ${doc.name}`} sub={`${c?.name} · ${doc.category} · uploaded by ${doc.uploadedBy} on ${fmtDate(doc.date, { day: 'numeric', month: 'short', year: 'numeric' })}${doc.expiry ? ` · runs out ${fmtDate(doc.expiry, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={o === 'reject' ? 'danger-solid' : 'primary'} onClick={save}>{o === 'ok' ? 'Mark as checked' : o === 'reject' ? 'Reject document' : 'Save as not needed'}</Button></>}>
      <Outcomes value={o} onChange={setO} />
      {o !== 'ok' && <Field label={o === 'reject' ? 'What is wrong?' : 'Why isn’t it needed?'} required error={tried && bad ? 'Please write a short reason (at least 5 letters).' : undefined} helper="Saved in the client’s history with your name and the time.">
        <Textarea autoFocus value={reason} onChange={e => setReason(e.target.value)} error={tried && bad} placeholder={o === 'reject' ? 'For example: page 2 is missing the signature' : 'For example: client pays privately, no funding letter'} />
      </Field>}
    </Modal>
  )
}

/** Record a caregiver check the Care Supervisor owns (skills check, spot check). */
export function CgCheckModal({ k, onClose }: { k: CgCheck; onClose: () => void }) {
  const s = useStore()
  const g = s.caregiver(k.caregiverId)
  const [o, setO] = useState<Outcome>('ok')
  const [reason, setReason] = useState('')
  const [expiry, setExpiry] = useState(addDays(365))
  const [tried, setTried] = useState(false)
  const bad = o !== 'ok' && reason.trim().length < 5
  const badDate = o === 'ok' && (!expiry || expiry <= TODAY)
  const save = () => {
    setTried(true); if (bad || badDate) return
    const status: CheckStatus = o === 'ok' ? 'Checked' : o === 'reject' ? 'Rejected' : 'Not needed'
    s.setChecks(x => x.map(y => y.id === k.id ? { ...y, status, checkedBy: s.me.name, checkedDate: TODAY, expiry: o === 'ok' ? expiry : y.expiry, reason: o === 'ok' ? undefined : reason.trim() } : y))
    s.log({ type: 'Caregiver check', action: `${k.name}: ${status.toLowerCase()}`, record: `${g?.name}`, before: k.status, after: status, reason: o === 'ok' ? `Next due ${fmtDate(expiry, { day: 'numeric', month: 'short', year: 'numeric' })}` : reason.trim() })
    s.toast(status === 'Rejected' ? `Rejected. HR and ${g?.name} have been told.` : `${k.name} saved for ${g?.name}.`)
    onClose()
  }
  return (
    <Modal title={`${k.name} · ${g?.name}`} sub={k.why} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={o === 'reject' ? 'danger-solid' : 'primary'} onClick={save}>{o === 'ok' ? 'Save as checked' : o === 'reject' ? 'Reject' : 'Save as not needed'}</Button></>}>
      {k.evidence && <AlertBanner tone="info" title="Sent for checking">{k.evidence}</AlertBanner>}
      <Outcomes value={o} onChange={setO} okLabel="Done and passed — mark as checked" okHelp="You watched them, or did the spot check, and they passed." />
      {o === 'ok' && <Field label="Check again by" required error={tried && badDate ? 'Please choose a date after today.' : undefined} helper="You’ll see it in Checks again before this date.">
        <Input type="date" min={addDays(1)} value={expiry} onChange={e => setExpiry(e.target.value)} error={tried && badDate} />
      </Field>}
      {o !== 'ok' && <Field label={o === 'reject' ? 'What needs to improve?' : 'Why isn’t it needed?'} required error={tried && bad ? 'Please write a short reason (at least 5 letters).' : undefined} helper="Saved with your name and the time.">
        <Textarea autoFocus value={reason} onChange={e => setReason(e.target.value)} error={tried && bad} placeholder={o === 'reject' ? 'For example: needs more practice using the shower seat safely' : 'For example: companion only, does no lifting'} />
      </Field>}
    </Modal>
  )
}

function Outcomes({ value, onChange, okLabel, okHelp }: { value: Outcome; onChange: (o: Outcome) => void; okLabel?: string; okHelp?: string }) {
  return (
    <div className="col" style={{ gap: 8, marginBottom: 14 }}>
      {OUT.map(x => {
        const label = x.id === 'ok' && okLabel ? okLabel : x.label
        const help = x.id === 'ok' && okHelp ? okHelp : x.help
        return (
          <label key={x.id} className="list-row" style={{ cursor: 'pointer', border: `1px solid ${value === x.id ? 'var(--border-focus)' : 'var(--border-default)'}`, borderRadius: 8, padding: '10px 12px' }}>
            <input type="radio" name="outcome" checked={value === x.id} onChange={() => onChange(x.id)} style={{ accentColor: 'var(--action-primary)' }} />
            <x.icon size={18} color={x.id === 'ok' ? 'var(--status-success)' : x.id === 'reject' ? 'var(--status-danger)' : 'var(--text-muted)'} />
            <span className="grow"><span className="t-medium" style={{ display: 'block' }}>{label}</span><span className="t-caption t-muted">{help}</span></span>
          </label>)
      })}
    </div>
  )
}
