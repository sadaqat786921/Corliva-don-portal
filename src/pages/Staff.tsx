import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { GraduationCap, ClipboardList, Plus, ChevronRight, ArrowLeft, Search, CheckCircle2, MapPin, Clock, UserRound } from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { ReviewOutcome, StaffReview, TODAY, Training, addDays } from '../data/seed'
import { attendanceMissing, reviewState, staffPeople } from '../data/nursing'
import { AlertBanner, Avatar, Button, CardHead, Chip, ChipTone, EmptyState, Field, Input, Modal, PageHead, Select, Tabs, Textarea } from '../components/ui'

const long = (d?: string) => d ? fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
export const reviewTone = (s: string): ChipTone => s === 'Overdue' ? 'danger' : s === 'Due soon' ? 'warning' : 'success'
export const outcomeTone = (o: ReviewOutcome): ChipTone => o === 'Needs to improve' ? 'warning' : 'success'
export const sessionState = (t: Training): { text: string; tone: ChipTone } => attendanceMissing(t) ? { text: 'Record who came', tone: 'warning' } : t.date >= TODAY ? { text: t.date === TODAY ? 'Today' : 'Coming up', tone: 'info' } : { text: 'Done', tone: 'success' }

export default function Staff() {
  const s = useStore()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'training' ? 'training' : 'reviews'
  const [show, setShow] = useState('Needs you')
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const people = staffPeople(s.caregivers, s.users).filter(p => s.inBranch(p.branch))
  const rows = useMemo(() => s.reviews.map(r => ({ r, p: people.find(p => p.id === r.personId)!, st: reviewState(r) })).filter(x => x.p)
    .filter(x => show === 'All' || x.st !== 'Up to date').sort((a, b) => a.r.due.localeCompare(b.r.due)), [s.reviews, people.length, show])
  const sessions = s.trainings.filter(t => show === 'All' || attendanceMissing(t) || t.date >= TODAY).sort((a, b) => Number(attendanceMissing(b)) - Number(attendanceMissing(a)) || b.date.localeCompare(a.date))
  const rv = s.reviews.find(r => r.id === reviewing)

  return (
    <>
      <PageHead title="Reviews and training" crumb="Reviews and training" sub="You review every caregiver and Care Supervisor once a year, and run in-service training with a record of who came. Skills checks are in Checks." actions={tab === 'training' ? <Button icon={Plus} onClick={() => setAdding(true)}>Add a training session</Button> : undefined} />
      <div className="card">
        <div style={{ padding: '0 16px' }}><Tabs value={tab} onChange={t => setParams(t === 'training' ? { tab: t } : {}, { replace: true })} tabs={[
          { id: 'reviews', label: 'Staff reviews', count: s.reviews.filter(r => reviewState(r) !== 'Up to date' && people.some(p => p.id === r.personId)).length },
          { id: 'training', label: 'Training', count: s.trainings.filter(t => attendanceMissing(t) || t.date >= TODAY).length },
        ]} /></div>
        <div className="toolbar">
          <div className="seg" role="group" aria-label="Show">{['Needs you', 'All'].map(o => <button key={o} className={show === o ? 'on' : ''} onClick={() => setShow(o)}>{o === 'Needs you' ? (tab === 'reviews' ? 'Due in 30 days or overdue' : 'Coming up or to record') : 'All'}</button>)}</div>
        </div>

        {tab === 'reviews' && (rows.length === 0 ? <EmptyState icon={CheckCircle2} title="All reviews are up to date" text="Nobody is due in the next 30 days." /> :
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Person</th><th>Role</th><th>Last review</th><th>Next review due</th><th>Status</th><th /></tr></thead>
            <tbody>{rows.map(({ r, p, st }) => { const last = r.history[r.history.length - 1]; return (
              <tr key={r.id}>
                <td><span className="row"><Avatar name={p.name} /><span><span className="t-medium" style={{ display: 'block' }}>{p.role === 'Care Supervisor' ? p.name : <Link to={`/caregivers/${p.id}?tab=staff&from=/staff`} style={{ color: 'var(--text-primary)' }}>{p.name}</Link>}</span><span className="t-caption t-muted">{s.branchName(p.branch)}</span></span></span></td>
                <td>{p.role}</td>
                <td>{last ? <><Chip tone={outcomeTone(last.outcome)}>{last.outcome}</Chip><div className="t-caption t-muted">{long(last.date)} · {last.by}</div></> : <span className="t-muted">First review</span>}</td>
                <td style={{ color: st === 'Overdue' ? 'var(--status-danger)' : undefined }}>{long(r.due)}</td>
                <td><Chip tone={reviewTone(st)}>{st}</Chip></td>
                <td style={{ textAlign: 'right' }}><Button size="sm" variant={st === 'Up to date' ? 'secondary' : 'primary'} icon={ClipboardList} onClick={() => setReviewing(r.id)}>Record review</Button></td>
              </tr>) })}</tbody>
          </table></div>)}

        {tab === 'training' && (sessions.length === 0 ? <EmptyState icon={GraduationCap} tone="neutral" title="No sessions" text="Add a training session to invite staff." /> :
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Session</th><th>When</th><th>Trainer</th><th>Invited</th><th>Came</th><th>Status</th><th style={{ width: 30 }} /></tr></thead>
            <tbody>{sessions.map(t => { const st = sessionState(t); return (
              <tr key={t.id} className="clickable" onClick={() => nav(`/training/${t.id}`)}>
                <td><div className="t-medium">{t.title}</div><div className="t-caption t-muted">{t.place}</div></td>
                <td>{long(t.date)}<div className="t-caption t-muted">{t.time}</div></td>
                <td>{t.trainer}</td><td>{t.invited.length}</td>
                <td>{t.attended === null ? <span className="t-muted">—</span> : `${t.attended.length} of ${t.invited.length}`}</td>
                <td><Chip tone={st.tone}>{st.text}</Chip></td>
                <td><ChevronRight size={16} color="var(--text-muted)" /></td>
              </tr>) })}</tbody>
          </table></div>)}
      </div>
      {rv && <ReviewModal r={rv} onClose={() => setReviewing(null)} />}
      {adding && <SessionModal onClose={() => setAdding(false)} onDone={id => nav(`/training/${id}`)} />}
    </>
  )
}

export function ReviewModal({ r, onClose }: { r: StaffReview; onClose: () => void }) {
  const s = useStore()
  const p = staffPeople(s.caregivers, s.users).find(x => x.id === r.personId)!
  const [outcome, setOutcome] = useState<ReviewOutcome>('Meets standards')
  const [note, setNote] = useState('')
  const [next, setNext] = useState(addDays(365))
  const [tried, setTried] = useState(false)
  const bad = note.trim().length < 5, badDate = !next || next <= TODAY
  const save = () => {
    setTried(true); if (bad || badDate) return
    s.setReviews(x => x.map(y => y.id === r.id ? { ...y, due: next, history: [...y.history, { date: TODAY, by: s.me.name, outcome, note: note.trim() }] } : y))
    s.log({ type: 'Staff review', action: `Reviewed: ${outcome.toLowerCase()}`, record: p.name, reason: note.trim(), after: `Next review ${long(next)}` })
    s.toast(`Review saved for ${p.name}. Next one due ${long(next)}.`); onClose()
  }
  return (
    <Modal title={`Review ${p.name}`} sub={`${p.role} · ${s.branchName(p.branch)}. Talk it through with them, then record the outcome. Earlier reviews are kept.`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save review</Button></>}>
      <Field label="Outcome" required><Select value={outcome} onChange={e => setOutcome(e.target.value as ReviewOutcome)} options={['Above standards', 'Meets standards', 'Needs to improve']} /></Field>
      {outcome === 'Needs to improve' && <AlertBanner tone="warning" title="Agree a plan">Write what they will work on and by when. Set an earlier next review.</AlertBanner>}
      <Field label="What you talked about" required error={tried && bad ? 'Please write a short note (at least 5 letters).' : undefined}><Textarea value={note} onChange={e => setNote(e.target.value)} error={tried && bad} placeholder="For example: clients very happy; would like dementia training" /></Field>
      <Field label="Next review by" required error={tried && badDate ? 'Please choose a date after today.' : undefined}><Input type="date" min={addDays(1)} value={next} onChange={e => setNext(e.target.value)} error={tried && badDate} /></Field>
    </Modal>
  )
}

function SessionModal({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const s = useStore()
  const people = staffPeople(s.caregivers, s.users).filter(p => p.role !== 'Care Supervisor')
  const [f, setF] = useState({ title: '', date: addDays(7), time: '10:00', place: 'North Branch office', trainer: s.me.name })
  const [invited, setInvited] = useState<string[]>([])
  const [tried, setTried] = useState(false)
  const bad = { title: f.title.trim().length < 3, date: !f.date || f.date < TODAY, invited: invited.length === 0 }
  const save = () => {
    setTried(true); if (bad.title || bad.date || bad.invited) return
    const id = 't' + Date.now()
    s.setTrainings(x => [{ id, ...f, title: f.title.trim(), invited, attended: null, added: TODAY }, ...x])
    s.log({ type: 'Training', action: 'Added a training session', record: f.title.trim(), after: `${long(f.date)} ${f.time} · ${invited.length} invited` })
    s.toast(`Session added. ${invited.length} ${invited.length === 1 ? 'person has' : 'people have'} been invited.`); onClose(); onDone(id)
  }
  return (
    <Modal title="Add a training session" sub="Everyone invited gets a message and sees it in the caregiver app." onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Add session</Button></>}>
      <Field label="What is it about?" required error={tried && bad.title ? 'Please give the session a name.' : undefined}><Input autoFocus value={f.title} onChange={e => setF({ ...f, title: e.target.value })} error={tried && bad.title} placeholder="For example: Safe use of a hoist" /></Field>
      <div className="grid g-2">
        <Field label="Date" required error={tried && bad.date ? 'Choose today or later.' : undefined}><Input type="date" min={TODAY} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} error={tried && bad.date} /></Field>
        <Field label="Time" required><Input type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} /></Field>
        <Field label="Where" required><Select value={f.place} onChange={e => setF({ ...f, place: e.target.value })} options={['North Branch office', 'South Branch office', 'Online']} /></Field>
        <Field label="Trainer" required><Input value={f.trainer} onChange={e => setF({ ...f, trainer: e.target.value })} /></Field>
      </div>
      <Field label="Who must come?" required error={tried && bad.invited ? 'Choose at least one person.' : undefined}>
        <div className="col" style={{ gap: 6 }}>
          <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setInvited(invited.length === people.length ? [] : people.map(p => p.id))}>{invited.length === people.length ? 'Clear' : 'Everyone'}</button>
          {people.map(p => <label key={p.id} className="check t-small"><input type="checkbox" checked={invited.includes(p.id)} onChange={e => setInvited(x => e.target.checked ? [...x, p.id] : x.filter(y => y !== p.id))} />{p.name} <span className="t-muted">· {p.role} · {s.branchName(p.branch)}</span></label>)}
        </div>
      </Field>
    </Modal>
  )
}

/** Full screen for one training session: who was invited, recording who came. */
export function TrainingDetail() {
  const { id } = useParams()
  const s = useStore()
  const nav = useNavigate()
  const t = s.trainings.find(x => x.id === id)
  const [came, setCame] = useState<string[]>(t?.attended ?? t?.invited ?? [])
  const [note, setNote] = useState(t?.note ?? '')
  if (!t) return <div className="card"><EmptyState icon={Search} tone="neutral" title="We can’t find this session" text="The link may be old." action={<Button onClick={() => nav('/staff?tab=training')}>All training</Button>} /></div>
  const people = staffPeople(s.caregivers, s.users)
  const st = sessionState(t)
  const canRecord = t.date <= TODAY
  const save = () => {
    s.setTrainings(x => x.map(y => y.id === t.id ? { ...y, attended: came, note: note.trim() || undefined } : y))
    s.log({ type: 'Training', action: t.attended ? 'Changed who came to training' : 'Recorded who came to training', record: t.title, after: `${came.length} of ${t.invited.length} came`, reason: note.trim() || undefined })
    s.toast(`Saved: ${came.length} of ${t.invited.length} came.`)
  }
  const missed = t.attended ? t.invited.filter(p => !t.attended!.includes(p)) : []
  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/staff?tab=training" className="row t-small t-medium" style={{ gap: 6, marginBottom: 8 }}><ArrowLeft size={15} />Training</Link>
          <div className="row wrap" style={{ gap: 10 }}><h1 className="t-h1">{t.title}</h1><Chip tone={st.tone}>{st.text}</Chip></div>
          <div className="t-small t-muted" style={{ marginTop: 4 }}>{fmtDate(t.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {t.time} · {t.place} · trainer {t.trainer}</div>
          <div className="crumbs"><Link to="/">Home</Link><span>/</span><Link to="/staff?tab=training">Training</Link><span>/</span><span>Session</span></div>
        </div>
      </div>
      {attendanceMissing(t) && <AlertBanner tone="warning" title="Record who came">The session has happened. Tick everyone who came and save.</AlertBanner>}
      {!canRecord && <AlertBanner tone="info" title="Coming up">You can record who came on the day of the session.</AlertBanner>}
      {missed.length > 0 && <AlertBanner tone="info" title={`${missed.length} didn’t come`}>{missed.map(id => people.find(p => p.id === id)?.name).join(', ')} — invite them to the next session.</AlertBanner>}
      <div className="grid g-main-side" style={{ alignItems: 'start' }}>
        <div className="card">
          <CardHead title={canRecord ? 'Who came' : 'Who is invited'} sub={canRecord ? 'Tick everyone who came. The record is kept for inspections.' : `${t.invited.length} people`} />
          <div className="card-body">
            {t.invited.map(pid => { const p = people.find(x => x.id === pid); if (!p) return null; return (
              <label key={pid} className="list-row" style={{ cursor: canRecord ? 'pointer' : 'default' }}>
                {canRecord && <input type="checkbox" style={{ width: 18, height: 18, accentColor: 'var(--action-primary)' }} checked={came.includes(pid)} onChange={e => setCame(x => e.target.checked ? [...x, pid] : x.filter(y => y !== pid))} />}
                <Avatar name={p.name} size="sm" /><span className="grow"><span className="t-medium t-small" style={{ display: 'block' }}>{p.name}</span><span className="t-caption t-muted">{p.role} · {s.branchName(p.branch)}</span></span>
                {t.attended && <Chip tone={t.attended.includes(pid) ? 'success' : 'danger'}>{t.attended.includes(pid) ? 'Came' : 'Didn’t come'}</Chip>}
              </label>) })}
            {canRecord && <>
              <div className="divider" style={{ margin: '12px 0' }} />
              <Field label="Note" helper="Optional. For example who will catch up later."><Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="For example: Rosa was on a visit — she’ll join the next session" /></Field>
              <div className="row" style={{ justifyContent: 'flex-end' }}><Button icon={CheckCircle2} onClick={save}>{t.attended ? 'Save changes' : 'Save who came'}</Button></div>
            </>}
          </div>
        </div>
        <div className="card">
          <CardHead title="Session details" />
          <div className="card-body"><dl className="kv" style={{ gridTemplateColumns: '90px 1fr' }}>
            <dt>Date</dt><dd>{long(t.date)}</dd><dt>Time</dt><dd className="row" style={{ gap: 6 }}><Clock size={13} />{t.time}</dd>
            <dt>Where</dt><dd className="row" style={{ gap: 6 }}><MapPin size={13} />{t.place}</dd><dt>Trainer</dt><dd className="row" style={{ gap: 6 }}><UserRound size={13} />{t.trainer}</dd>
            <dt>Added</dt><dd>{long(t.added)}</dd>{t.note && <><dt>Note</dt><dd>{t.note}</dd></>}
          </dl></div>
        </div>
      </div>
    </>
  )
}
