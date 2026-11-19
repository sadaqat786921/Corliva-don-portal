import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Search, CheckCircle2, MessageSquareReply, FileText, ChevronRight, ClipboardCheck, Clock, Plus, Minus, PenLine } from 'lucide-react'
import { useStore, fmtDate, showAt, stampNow } from '../data/store'
import { CarePlan, TODAY, addDays } from '../data/seed'
import { plansFor, reviewDue, reviewOverdue } from '../data/clients'
import { AlertBanner, Avatar, Button, CardHead, Chip, EmptyState, Field, Input, Modal, Textarea } from '../components/ui'
import { PlanView, planTone } from './ClientDetail'

const long = (d?: string) => d ? fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

/** What is different between the plan in use and a newer version. */
function diff(a: CarePlan | undefined, b: CarePlan) {
  if (!a || a.id === b.id || a.version > b.version) return { keys: new Set<string>(), lines: [] as { icon: typeof Plus; text: string }[] }
  const keys = new Set<string>(); const lines: { icon: typeof Plus; text: string }[] = []
  b.tasks.filter(t => !a.tasks.includes(t)).forEach(t => { keys.add('tasks'); lines.push({ icon: Plus, text: `New task: ${t}` }) })
  a.tasks.filter(t => !b.tasks.includes(t)).forEach(t => { keys.add('tasks'); lines.push({ icon: Minus, text: `Task taken off: ${t}` }) })
  b.services.filter(t => !a.services.includes(t)).forEach(t => { keys.add('services'); lines.push({ icon: Plus, text: `New service: ${t}` }) })
  a.services.filter(t => !b.services.includes(t)).forEach(t => { keys.add('services'); lines.push({ icon: Minus, text: `Service taken off: ${t}` }) })
  if (a.hoursPerWeek !== b.hoursPerWeek) { keys.add('hours'); lines.push({ icon: PenLine, text: `Hours a week: ${a.hoursPerWeek ?? '—'} → ${b.hoursPerWeek ?? '—'}` }) }
  if (a.instructions !== b.instructions) { keys.add('instructions'); lines.push({ icon: PenLine, text: 'Instructions changed' }) }
  if (a.goals !== b.goals) { keys.add('goals'); lines.push({ icon: PenLine, text: 'Goals changed' }) }
  if (a.reviewDate !== b.reviewDate) { keys.add('review'); lines.push({ icon: PenLine, text: `Review date: ${long(a.reviewDate)} → ${long(b.reviewDate)}` }) }
  return { keys, lines }
}

export default function CarePlanDetail() {
  const { id } = useParams()
  const s = useStore()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const from = params.get('from') ?? '/care-plans'
  const backLabel = from.startsWith('/clients/') ? 'Client' : from === '/' ? 'My work' : 'Care plans'
  const [act, setAct] = useState<null | 'approve' | 'changes' | 'review'>(null)
  const p = s.carePlans.find(x => x.id === id)
  const c = p && s.client(p.clientId)
  if (!p || !c || !s.inBranch(c.branch)) return <div className="card"><EmptyState icon={Search} tone="neutral" title="We can’t find this care plan" text="It may be in a branch you’ve filtered out, or the link is old." action={<Button onClick={() => nav('/care-plans')}>All care plans</Button>} /></div>

  const all = plansFor(c.id, s.carePlans)
  const d = diff(all.current, p)
  const isCurrent = all.current?.id === p.id
  const newer = all.all.find(x => x.version > p.version && (x.status === 'Approved' || x.status === 'Superseded'))

  return (
    <>
      <div className="page-head">
        <div>
          <Link to={from} className="row t-small t-medium" style={{ gap: 6, marginBottom: 8 }}><ArrowLeft size={15} />{backLabel}</Link>
          <div className="row wrap" style={{ gap: 10 }}>
            <h1 className="t-h1">{c.name} · Care plan version {p.version}</h1>
            <Chip tone={planTone(p.status)}>{p.status === 'Superseded' ? 'Replaced' : p.status}</Chip>
            {isCurrent && <Chip tone="success">In use</Chip>}
          </div>
          <div className="t-small t-muted" style={{ marginTop: 4 }}>Written by {p.createdBy} · {s.branchName(c.branch)}{p.submittedDate ? ` · sent to you ${long(p.submittedDate)}` : ''}</div>
          <div className="crumbs"><Link to="/">Home</Link><span>/</span><Link to="/care-plans">Care plans</Link><span>/</span><span>{c.name} v{p.version}</span></div>
        </div>
        <div className="actions">
          {p.status === 'Awaiting review' && <>
            <Button variant="secondary" icon={MessageSquareReply} onClick={() => setAct('changes')}>Ask for changes</Button>
            <Button icon={CheckCircle2} onClick={() => setAct('approve')}>Approve</Button>
          </>}
          {isCurrent && !all.working && <Button variant={reviewDue(p) ? 'primary' : 'secondary'} icon={ClipboardCheck} onClick={() => setAct('review')}>Record review</Button>}
        </div>
      </div>

      {p.status === 'Awaiting review' && <AlertBanner tone="info" title="Waiting for approval">{all.current ? `Version ${all.current.version} stays in use until you approve this one. Changes are highlighted.` : `This is ${c.name}’s first plan. ${c.coordinator} can’t plan visits until you approve it.`}</AlertBanner>}
      {p.status === 'Changes requested' && <AlertBanner tone="warning" title="Sent back to the coordinator">{p.createdBy} is making the changes and will send it again.</AlertBanner>}
      {p.status === 'Draft' && <AlertBanner tone="info" title="Still a draft">{p.createdBy} hasn’t sent it to you yet.</AlertBanner>}
      {p.status === 'Superseded' && <AlertBanner tone="info" title="This version was replaced">{newer ? `Version ${newer.version} replaced it on ${long(newer.effectiveDate)}.` : ''} It is kept for the record.</AlertBanner>}
      {isCurrent && all.working && <AlertBanner tone="info" title={`Version ${all.working.version} is being worked on`} action={<Button size="sm" variant="secondary" onClick={() => nav(`/care-plans/${all.working!.id}?from=${encodeURIComponent(from)}`)}>Open version {all.working.version}</Button>}>Status: {all.working.status.toLowerCase()}. This version stays in use until the new one is approved.</AlertBanner>}
      {isCurrent && !all.working && reviewOverdue(p) && <AlertBanner tone="danger" title={`Review overdue since ${long(p.reviewDate)}`}>Check the plan still fits {c.name.split(' ')[0]}’s needs, then record the review.</AlertBanner>}
      {isCurrent && !all.working && p.lastReview?.outcome === 'Changes needed' && <AlertBanner tone="warning" title={`Waiting for a new version from ${c.coordinator}`}>Your review on {long(p.lastReview.date)}: “{p.lastReview.note}”</AlertBanner>}

      <div className="grid g-main-side" style={{ alignItems: 'start' }}>
        <div className="col" style={{ gap: 16 }}>
          {d.lines.length > 0 && <div className="card">
            <CardHead title={`What changed from version ${all.current!.version}`} sub="Highlighted in yellow in the plan below." />
            <div className="card-body col" style={{ gap: 8 }}>{d.lines.map((l, i) => <div key={i} className="row t-small" style={{ gap: 8 }}><l.icon size={14} color={l.icon === Minus ? 'var(--status-danger)' : l.icon === Plus ? 'var(--status-success)' : 'var(--status-warning)'} />{l.text}</div>)}</div>
          </div>}
          <div className="card">
            <CardHead title="The plan" sub="What caregivers see and follow at every visit." />
            <div className="card-body"><PlanView p={p} changed={d.keys} /></div>
          </div>
          <div className="card">
            <CardHead title="Comments" sub="Between you and the coordinator. Nothing is removed." />
            <div className="card-body timeline">
              {p.comments.length === 0 ? <div className="t-small t-muted">No comments.</div> : p.comments.map((cm, i) => (
                <div key={i} className="timeline-item"><Avatar name={cm.by} size="sm" /><div><div className="t-small">{cm.text}</div><div className="t-caption t-muted row" style={{ gap: 4 }}><Clock size={11} />{cm.by} · {showAt(cm.at)}</div></div></div>))}
            </div>
          </div>
        </div>
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <CardHead title="About this version" />
            <div className="card-body"><dl className="kv" style={{ gridTemplateColumns: '110px 1fr' }}>
              <dt>Written by</dt><dd>{p.createdBy}</dd>
              <dt>Started</dt><dd>{long(p.createdDate)}</dd>
              <dt>Sent to you</dt><dd>{long(p.submittedDate)}</dd>
              {p.approvedBy && <><dt>Approved by</dt><dd>{p.approvedBy} · {long(p.approvedDate)}</dd><dt>In use from</dt><dd>{long(p.effectiveDate)}</dd></>}
              <dt>Review by</dt><dd style={{ color: isCurrent && reviewOverdue(p) ? 'var(--status-danger)' : undefined }}>{long(p.reviewDate)}</dd>
              {p.lastReview && <><dt>Last review</dt><dd>{p.lastReview.outcome} · {long(p.lastReview.date)}<div className="t-caption t-muted">{p.lastReview.note}</div></dd></>}
            </dl></div>
          </div>
          <div className="card">
            <CardHead title="Client" action={<button className="link-btn" onClick={() => nav(`/clients/${c.id}`)}>Open client</button>} />
            <div className="card-body">
              <div className="row" style={{ gap: 10, marginBottom: 10 }}><Avatar name={c.name} /><div><div className="t-medium">{c.name}</div><div className="t-caption t-muted">{c.status} · coordinator {c.coordinator}</div></div></div>
              {c.assessment ? <dl className="kv" style={{ gridTemplateColumns: '110px 1fr' }}>
                <dt>Assessment</dt><dd>{c.assessment.needs}</dd><dt>Risks</dt><dd>{c.assessment.risks}</dd><dt>Getting around</dt><dd>{c.assessment.mobility}</dd>
                <dt>Hours advised</dt><dd>{c.assessment.hours ?? '—'}{c.assessment.hours !== null && p.hoursPerWeek !== null && c.assessment.hours !== p.hoursPerWeek && <div className="t-caption" style={{ color: 'var(--status-warning)' }}>Plan says {p.hoursPerWeek}</div>}</dd>
              </dl> : <div className="t-small t-muted">{c.preferences || 'No notes.'}</div>}
            </div>
          </div>
          <div className="card">
            <CardHead title="All versions" sub="Every version is kept." />
            <div className="card-body">{all.all.map(x => (
              <button key={x.id} className="list-row clickable-row" style={{ width: '100%', textAlign: 'left', background: x.id === p.id ? 'var(--bg-subtle)' : undefined }} onClick={() => nav(`/care-plans/${x.id}?from=${encodeURIComponent(from)}`)}>
                <FileText size={16} color="var(--text-muted)" /><div className="grow"><div className="t-medium t-small">Version {x.version}{x.id === p.id ? ' · open now' : ''}</div><div className="t-caption t-muted">{x.approvedDate ? `Approved ${long(x.approvedDate)}` : `Started ${long(x.createdDate)}`}</div></div>
                <Chip tone={planTone(x.status)}>{x.status === 'Superseded' ? 'Replaced' : x.status}</Chip><ChevronRight size={16} color="var(--text-muted)" />
              </button>))}</div>
          </div>
        </div>
      </div>

      {act === 'approve' && <ApproveModal p={p} current={all.current} onClose={() => setAct(null)} />}
      {act === 'changes' && <ChangesModal p={p} onClose={() => setAct(null)} />}
      {act === 'review' && <ReviewModal p={p} onClose={() => setAct(null)} />}
    </>
  )
}

function ApproveModal({ p, current, onClose }: { p: CarePlan; current?: CarePlan; onClose: () => void }) {
  const s = useStore()
  const c = s.client(p.clientId)!
  const [eff, setEff] = useState(TODAY)
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)
  const bad = !eff || eff < TODAY
  const save = () => {
    setTried(true); if (bad) return
    s.setCarePlans(x => x.map(y => y.id === p.id ? { ...y, status: 'Approved', approvedBy: s.me.name, approvedDate: TODAY, effectiveDate: eff, comments: note.trim() ? [...y.comments, { by: s.me.name, at: stampNow(), text: note.trim() }] : y.comments }
      : current && y.id === current.id ? { ...y, status: 'Superseded' } : y))
    s.clientNote(c.id, `Care plan version ${p.version} approved by ${s.me.name}, in use from ${long(eff)}.${current ? ` Version ${current.version} replaced and kept.` : ''}`)
    s.log({ type: 'Care plan', action: 'Approved a care plan', record: `${c.name} · version ${p.version}`, after: `In use from ${long(eff)}` })
    s.toast(current ? `Version ${p.version} approved. ${p.createdBy} and the caregivers have been told.` : `Approved. ${p.createdBy} can now plan ${c.name.split(' ')[0]}’s visits.`); onClose()
  }
  return (
    <Modal title={`Approve version ${p.version} for ${c.name}?`} sub={current ? `Version ${current.version} will be replaced. It is kept in the list of versions.` : 'This is the first plan. Once approved, visits can be planned.'} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={CheckCircle2} onClick={save}>Approve plan</Button></>}>
      <Field label="In use from" required error={tried && bad ? 'Please choose today or a later date.' : undefined} helper="Caregivers see this version from this date."><Input type="date" min={TODAY} value={eff} onChange={e => setEff(e.target.value)} error={tried && bad} /></Field>
      <Field label="Note for the coordinator" helper="Optional."><Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="For example: good plan — please check the walk is going well at the next review" /></Field>
    </Modal>
  )
}

function ChangesModal({ p, onClose }: { p: CarePlan; onClose: () => void }) {
  const s = useStore()
  const c = s.client(p.clientId)!
  const [t, setT] = useState(''); const [tried, setTried] = useState(false); const bad = t.trim().length < 5
  const save = () => {
    setTried(true); if (bad) return
    s.setCarePlans(x => x.map(y => y.id === p.id ? { ...y, status: 'Changes requested', comments: [...y.comments, { by: s.me.name, at: stampNow(), text: t.trim() }] } : y))
    s.clientNote(c.id, `Care plan version ${p.version} sent back for changes by ${s.me.name}.`)
    s.log({ type: 'Care plan', action: 'Asked for changes to a care plan', record: `${c.name} · version ${p.version}`, reason: t.trim() })
    s.toast(`Sent back to ${p.createdBy} with your comments.`); onClose()
  }
  return (
    <Modal title="Ask for changes" sub={`${p.createdBy} sees your comments, fixes the plan and sends it again. ${c.name}’s current plan stays in use.`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Send back</Button></>}>
      <Field label="What needs to change?" required error={tried && bad ? 'Please write what needs to change.' : undefined}><Textarea autoFocus value={t} onChange={e => setT(e.target.value)} error={tried && bad} placeholder="For example: please add how often to check her skin, and who to call if it’s red" /></Field>
    </Modal>
  )
}

function ReviewModal({ p, onClose }: { p: CarePlan; onClose: () => void }) {
  const s = useStore()
  const c = s.client(p.clientId)!
  const [o, setO] = useState<'No changes needed' | 'Changes needed'>('No changes needed')
  const [next, setNext] = useState(addDays(180))
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)
  const badNote = note.trim().length < 5
  const badDate = o === 'No changes needed' && (!next || next <= TODAY)
  const save = () => {
    setTried(true); if (badNote || badDate) return
    s.setCarePlans(x => x.map(y => y.id === p.id ? { ...y, reviewDate: o === 'No changes needed' ? next : y.reviewDate, lastReview: { by: s.me.name, date: TODAY, outcome: o, note: note.trim() } } : y))
    s.clientNote(c.id, `Care plan reviewed by ${s.me.name}: ${o.toLowerCase()}. ${note.trim()}`)
    s.log({ type: 'Care plan', action: `Reviewed a care plan: ${o.toLowerCase()}`, record: `${c.name} · version ${p.version}`, reason: note.trim(), after: o === 'No changes needed' ? `Next review ${long(next)}` : undefined })
    s.toast(o === 'No changes needed' ? `Review saved. Next review ${long(next)}.` : `Review saved. ${c.coordinator} has been asked to write a new version.`); onClose()
  }
  return (
    <Modal title={`Review ${c.name}’s care plan`} sub={`Version ${p.version}, review due ${long(p.reviewDate)}. Check it still fits their needs.`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save review</Button></>}>
      <div className="col" style={{ gap: 8, marginBottom: 14 }}>
        {(['No changes needed', 'Changes needed'] as const).map(x => (
          <label key={x} className="list-row" style={{ cursor: 'pointer', border: `1px solid ${o === x ? 'var(--border-focus)' : 'var(--border-default)'}`, borderRadius: 8, padding: '10px 12px' }}>
            <input type="radio" name="rv" checked={o === x} onChange={() => setO(x)} style={{ accentColor: 'var(--action-primary)' }} />
            <span className="grow"><span className="t-medium" style={{ display: 'block' }}>{x === 'No changes needed' ? 'Still right — keep this plan' : 'Needs changes — ask for a new version'}</span><span className="t-caption t-muted">{x === 'No changes needed' ? 'Set the next review date.' : `${c.coordinator} writes a new version and sends it to you. This one stays in use.`}</span></span>
          </label>))}
      </div>
      {o === 'No changes needed' && <Field label="Next review by" required error={tried && badDate ? 'Please choose a date after today.' : undefined}><Input type="date" min={addDays(1)} value={next} onChange={e => setNext(e.target.value)} error={tried && badDate} /></Field>}
      <Field label={o === 'No changes needed' ? 'What did you check?' : 'What needs to change?'} required error={tried && badNote ? 'Please write a short note (at least 5 letters).' : undefined}>
        <Textarea value={note} onChange={e => setNote(e.target.value)} error={tried && badNote} placeholder={o === 'No changes needed' ? 'For example: spoke to Mark and the caregiver, all going well' : 'For example: he now needs help with meals too'} />
      </Field>
    </Modal>
  )
}
