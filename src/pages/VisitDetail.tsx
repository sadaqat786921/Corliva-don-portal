import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, UserPlus, CalendarClock, CheckCircle2, Clock, MapPin, KeyRound, Phone, Repeat, Ban, TriangleAlert, LogIn, LogOut,
  Circle, Search, StickyNote, ClipboardList, History, UserRound, Heart, Undo2, PenLine, ShieldAlert, XCircle, Receipt, Navigation,
} from 'lucide-react'
import { useStore, fmtDate, stampNow } from '../data/store'
import { TODAY, Visit, nowHM } from '../data/seed'
import { DAY_NAMES, checkCaregiver, dayOfWeek, liveState, minutesLate } from '../data/schedule'
import { planForVisit } from '../data/clients'
import { actualMins, hrs, mins, plannedMins, serviceFlags } from '../data/review'
import { AlertBanner, Avatar, Button, CardHead, Chip, ChipTone, EmptyState, Field, Input, Modal, ReasonDialog, Textarea } from '../components/ui'

const BACK: Record<string, string> = { '/approvals': 'Visit approvals', '/today': 'Today’s visits', '/schedule': 'Schedule', '/': 'My work' }
const vTone = (v: Visit): ChipTone => v.status === 'Completed' ? 'success' : v.status === 'Unassigned' ? 'danger' : v.status === 'Cancelled' ? 'neutral' : 'info'
const aTone = (a: Visit['approval']): ChipTone => a === 'Approved' ? 'success' : a === 'Sent back' ? 'danger' : 'warning'
const long = (d: string) => fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })

export default function VisitDetail() {
  const { id } = useParams()
  const s = useStore()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const from = params.get('from') ?? '/schedule'
  const fromPath = from.split('?')[0]
  const backLabel = BACK[fromPath] ?? (from.startsWith('/clients/') ? 'Client' : from.startsWith('/caregivers/') ? 'Caregiver' : from.startsWith('/incidents/') ? 'Incident' : 'Back')
  const [picking, setPicking] = useState(params.get('assign') === '1')
  const [act, setAct] = useState<null | 'approve' | 'return' | 'correct' | 'adjust' | 'keep'>(null)
  useEffect(() => { setPicking(params.get('assign') === '1') }, [id])
  const v = s.visits.find(x => x.id === id)
  if (!v || !s.inBranch(v.branch)) return <div className="card"><EmptyState icon={Search} tone="neutral" title="We can’t find this visit" text="It may be in a branch you’ve filtered out, or the link is old." action={<Button onClick={() => nav('/schedule')}>Open Schedule</Button>} /></div>

  const c = s.client(v.clientId)!
  const g = s.caregiver(v.caregiverId)
  const plan = planForVisit(v, s.carePlans)
  const editable = v.date >= TODAY && ['Scheduled', 'Unassigned'].includes(v.status)
  const live = v.date === TODAY && !v.approval ? liveState(v) : null
  const flags = serviceFlags(v, plan, s.rules.lateArrivalMins)
  const stops = flags.some(f => f.stopsApproval)
  const history = s.audit.filter(a => a.record.includes('#' + v.id.slice(1)))
  const repeats = v.series ? s.visits.filter(x => x.series === v.series && x.status !== 'Cancelled') : []
  const repeatDays = Array.from(new Set(repeats.map(x => dayOfWeek(x.date)))).sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
  const emergency = c.people.find(p => p.emergency)
  const cgBlocked = g?.readiness === 'Blocked' && editable && !v.override
  const setPick = (on: boolean) => { setPicking(on); const p = new URLSearchParams(params); if (on) p.set('assign', '1'); else p.delete('assign'); setParams(p, { replace: true }) }
  const record = `Visit #${v.id.slice(1)}`

  const keepAnyway = (reason: string) => {
    s.setVisits(x => x.map(y => y.id === v.id ? { ...y, review: undefined, override: { reason, by: s.me.name, at: stampNow() } } : y))
    s.log({ type: 'Override', action: `Kept ${g?.name} on the visit (exception)`, record, reason })
    s.toast(`Exception saved. ${g?.name} stays on the visit.`); setAct(null)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Link to={from} className="row t-small t-medium" style={{ gap: 6, marginBottom: 8 }}><ArrowLeft size={15} />{backLabel}</Link>
          <div className="row wrap" style={{ gap: 10 }}>
            <h1 className="t-h1">{c.name} · Visit #{v.id.slice(1)}</h1>
            <Chip tone={vTone(v)}>{v.status}</Chip>
            {v.approval && <Chip tone={aTone(v.approval)}>{v.approval === 'To review' ? 'Waiting for a check' : v.approval}</Chip>}
            {live && live !== 'Cancelled' && live !== 'Done' && <Chip tone={live === 'Late' || live === 'No caregiver' ? 'danger' : live === 'In progress' ? 'info' : 'warning'}>{live}</Chip>}
            {(v.review || cgBlocked) && <Chip tone="danger">Needs a decision</Chip>}
            {v.override && <Chip tone="warning">Exception made</Chip>}
          </div>
          <div className="t-small t-muted" style={{ marginTop: 4 }}>{v.date === TODAY ? 'Today' : long(v.date)} · {v.start}–{v.end} · {v.service} · {s.branchName(v.branch)}{v.series && <> · <Repeat size={12} style={{ verticalAlign: -1 }} /> repeats {repeatDays.map(d => DAY_NAMES[d]).join(', ')}</>}</div>
          <div className="crumbs"><Link to="/">Home</Link><span>/</span><Link to={from}>{backLabel}</Link><span>/</span><span>Visit #{v.id.slice(1)}</span></div>
        </div>
        <div className="actions">
          {v.approval === 'To review' && <>
            <Button variant="danger" icon={Undo2} onClick={() => setAct('return')}>Send back to fix</Button>
            <Button variant="secondary" icon={PenLine} onClick={() => setAct('correct')}>Correct times</Button>
            <Button icon={CheckCircle2} disabled={stops} title={stops ? 'Correct the finish time first' : ''} onClick={() => setAct('approve')}>Approve visit</Button>
          </>}
          {v.approval === 'Sent back' && <Button variant="secondary" icon={PenLine} onClick={() => setAct('correct')}>Correct it myself</Button>}
          {v.approval === 'Approved' && !v.billing && <Button variant="secondary" icon={PenLine} onClick={() => setAct('correct')}>Correct approved visit</Button>}
          {v.approval === 'Approved' && v.billing && !v.adjustment && <Button variant="secondary" icon={Receipt} onClick={() => setAct('adjust')}>Ask Finance for an adjustment</Button>}
          {editable && cgBlocked && <Button variant="secondary" icon={ShieldAlert} onClick={() => setAct('keep')}>Keep {g!.name.split(' ')[0]} anyway</Button>}
          {editable && !picking && <Button icon={UserPlus} onClick={() => setPick(true)}>{v.caregiverId ? 'Change caregiver' : 'Find a caregiver'}</Button>}
        </div>
      </div>

      {v.status === 'Unassigned' && <AlertBanner tone="danger" title="This visit has no caregiver">{c.coordinator} is looking for cover. You can choose someone below, including making an exception.</AlertBanner>}
      {cgBlocked && <AlertBanner tone="danger" title={`${g!.name} can’t do this visit`}>{g!.issue}. Choose someone else, or keep {g!.name.split(' ')[0]} as an exception with a written reason.</AlertBanner>}
      {v.override && <AlertBanner tone="warning" title="An exception was made">{v.override.by} · {v.override.at}: “{v.override.reason}”</AlertBanner>}
      {live === 'Late' && <AlertBanner tone="danger" title={`${g?.name} hasn’t checked in`}>{v.end <= nowHM() ? `The visit should have finished at ${v.end}.` : `${minutesLate(v)} minutes past the start time.`} {c.coordinator} is following it up. Call {g?.phone} if you need to.</AlertBanner>}
      {v.status === 'Cancelled' && <AlertBanner tone="info" title="This visit was cancelled">{v.cancelReason ? `Reason: ${v.cancelReason}.` : ''} It stays in the history.</AlertBanner>}
      {v.approval === 'To review' && stops && <AlertBanner tone="danger" title="Can’t approve yet">The caregiver didn’t check out. Ask {g?.name.split(' ')[0]} when they left, then use “Correct times”.</AlertBanner>}
      {v.approval === 'To review' && !stops && flags.length === 0 && <AlertBanner tone="success" title="Matches the plan">Times, place and tasks all match. You can approve it.</AlertBanner>}
      {v.approval === 'Sent back' && v.returned && <AlertBanner tone="warning" title="Sent back to fix">{v.returned.by} · {v.returned.at}: “{v.returned.reason}” {g?.name ?? 'The caregiver'} corrects it in the app and sends it again. You can also correct it yourself.</AlertBanner>}
      {v.approval === 'Approved' && <AlertBanner tone="success" title={`Approved by ${v.approvedBy} · ${v.approvedAt}`}>{v.billing ? 'Finance has already invoiced this visit. Changes now go to Finance as an adjustment — the approved record stays as it is.' : 'Ready for billing and timesheets. You can still correct it — every change is recorded.'}</AlertBanner>}
      {v.adjustment && <AlertBanner tone="info" title="Adjustment sent to Finance">{v.adjustment.before} → {v.adjustment.after}. Reason: “{v.adjustment.reason}” ({v.adjustment.by} · {v.adjustment.at})</AlertBanner>}

      <div className="grid g-main-side" style={{ alignItems: 'start' }}>
        <div className="col" style={{ gap: 16 }}>
          {v.approval ? <ServiceRecord v={v} flags={flags} planTasks={plan?.tasks ?? []} /> : picking && editable ? <CaregiverPicker v={v} onDone={() => setPick(false)} onCancel={() => setPick(false)} /> : (
            <div className="card">
              <CardHead title="Caregiver" action={g && <button className="link-btn" onClick={() => nav(`/caregivers/${g.id}?from=/visits/${v.id}`)}>See profile</button>} />
              <div className="card-body">
                {g ? <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
                  <Avatar name={g.name} size="lg" />
                  <div className="grow col" style={{ gap: 4 }}>
                    <div className="row wrap" style={{ gap: 8 }}><span className="t-h3">{g.name}</span><Chip tone={g.readiness === 'Ready' ? 'success' : g.readiness === 'Warning' ? 'warning' : 'danger'}>{g.readiness === 'Blocked' ? 'Not ready' : g.readiness}</Chip></div>
                    <div className="t-small t-muted">{g.type} · trained for {g.skills.join(', ').toLowerCase()}</div>
                    <div className="row t-small" style={{ gap: 6 }}><Phone size={13} />{g.phone}</div>
                  </div>
                </div> : <div className="row" style={{ gap: 12 }}><div className="stat-icon tone-danger"><UserPlus /></div><div className="grow"><div className="t-medium">Nobody is assigned</div><div className="t-small t-muted">{editable ? 'Use “Find a caregiver” to see who can do it.' : 'This visit had no caregiver.'}</div></div>{editable && <Button icon={UserPlus} onClick={() => setPick(true)}>Find a caregiver</Button>}</div>}
              </div>
            </div>)}

          {!v.approval && <div className="card">
            <CardHead title="Progress" sub={v.date === TODAY ? `Updates live from the caregiver app. Late is ${s.rules.lateArrivalMins} minutes after the start.` : undefined} />
            <div className="card-body col" style={{ gap: 14 }}>
              {[
                { label: 'Planned', sub: `${v.start}–${v.end}`, done: true, icon: CalendarClock },
                { label: g ? `${g.name} assigned` : 'Caregiver assigned', sub: g ? g.type : 'Not yet', done: !!g, icon: UserRound },
                { label: 'Checked in', sub: v.checkIn ? `at ${v.checkIn}` : live === 'Late' ? 'Late — not yet' : 'Not yet', done: !!v.checkIn, late: live === 'Late' },
                { label: 'Checked out', sub: v.checkOut ? `at ${v.checkOut}` : 'Not yet', done: !!v.checkOut },
              ].map((st, i) => (
                <div key={i} className="row" style={{ gap: 12 }}>
                  {st.done ? <CheckCircle2 size={20} color="var(--status-success)" /> : st.late ? <TriangleAlert size={20} color="var(--status-danger)" /> : <Circle size={20} color="var(--border-strong)" />}
                  <span className="grow"><span className={st.done ? 't-medium' : 't-muted'} style={{ display: 'block' }}>{st.label}</span><span className="t-caption" style={{ color: st.late ? 'var(--status-danger)' : 'var(--text-muted)' }}>{st.sub}</span></span>
                </div>))}
              {v.status === 'Cancelled' && <div className="t-small t-muted">Cancelled — no check-in expected.</div>}
            </div>
          </div>}

          <div className="card">
            <CardHead title={`Care plan for this visit${plan ? ` · version ${plan.version}` : ''}`} action={plan && <button className="link-btn" onClick={() => nav(`/care-plans/${plan.id}?from=/visits/${v.id}`)}>Open care plan</button>} />
            <div className="card-body col" style={{ gap: 10 }}>
              {!plan ? <div className="t-small t-muted">No approved care plan.</div> : <>
                <div className="col" style={{ gap: 6 }}>{plan.tasks.map(t => <div key={t} className="row t-small" style={{ gap: 8 }}><ClipboardList size={14} color="var(--text-muted)" />{t}</div>)}</div>
                {plan.instructions && <div className="t-small" style={{ whiteSpace: 'pre-wrap', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 12px' }}>{plan.instructions}</div>}
              </>}
            </div>
          </div>

          {v.coverNote && <div className="card">
            <CardHead title="Coordinator’s note" />
            <div className="card-body"><div className="row t-small" style={{ gap: 8, alignItems: 'flex-start' }}><StickyNote size={15} color="var(--text-muted)" style={{ marginTop: 2 }} />{v.coverNote}</div></div>
          </div>}
        </div>

        <div className="col" style={{ gap: 16 }}>
          {v.approval && g && <div className="card">
            <CardHead title="Caregiver" action={<button className="link-btn" onClick={() => nav(`/caregivers/${g.id}?from=/visits/${v.id}`)}>See profile</button>} />
            <div className="card-body"><div className="row" style={{ gap: 10 }}><Avatar name={g.name} /><div><div className="t-medium">{g.name}</div><div className="t-caption t-muted">{g.type} · {g.phone}</div></div></div></div>
          </div>}
          <div className="card">
            <CardHead title="Client" action={<button className="link-btn" onClick={() => nav(`/clients/${c.id}`)}>Open client</button>} />
            <div className="card-body">
              <div className="row" style={{ gap: 10, marginBottom: 12 }}><Avatar name={c.name} /><div><div className="t-medium">{c.name}</div><div className="t-caption t-muted">{c.services} · coordinator {c.coordinator}</div></div></div>
              <dl className="kv" style={{ gridTemplateColumns: '100px 1fr' }}>
                <dt>Address</dt><dd className="row" style={{ gap: 6, alignItems: 'flex-start' }}><MapPin size={13} style={{ marginTop: 3 }} />{c.address || '—'}</dd>
                <dt>Getting in</dt><dd className="row" style={{ gap: 6, alignItems: 'flex-start' }}><KeyRound size={13} style={{ marginTop: 3 }} />{c.access || '—'}</dd>
                <dt>Phone</dt><dd>{c.phone}</dd>
                {c.preferences && <><dt>Likes, needs</dt><dd className="row" style={{ gap: 6, alignItems: 'flex-start' }}><Heart size={13} style={{ marginTop: 3 }} />{c.preferences}</dd></>}
                <dt>Emergency</dt><dd>{emergency ? <>{emergency.name}<div className="t-caption t-muted">{emergency.relationship} · {emergency.phone}</div></> : <span style={{ color: 'var(--status-danger)' }}>None added</span>}</dd>
              </dl>
            </div>
          </div>
          <div className="card">
            <CardHead title="Visit details" />
            <div className="card-body">
              <dl className="kv" style={{ gridTemplateColumns: '100px 1fr' }}>
                <dt>Date</dt><dd>{long(v.date)}</dd>
                <dt>Time</dt><dd className="row" style={{ gap: 6 }}><Clock size={13} />{v.start} – {v.end}</dd>
                <dt>Service</dt><dd>{v.service}</dd>
                <dt>Branch</dt><dd>{s.branchName(v.branch)}</dd>
                <dt>Repeats</dt><dd>{v.series ? `Every ${repeatDays.map(d => DAY_NAMES[d]).join(', ')}` : 'No — one-off visit'}</dd>
              </dl>
            </div>
          </div>
          <div className="card">
            <CardHead title="Changes" sub="Every change to this visit. Nothing is removed." />
            <div className="card-body timeline">
              {history.length === 0 ? <div className="t-small t-muted">No changes since it was planned.</div> : history.map(h => (
                <div key={h.id} className="timeline-item"><div className="stat-icon tone-neutral"><History /></div><div><div className="t-small"><b>{h.action}</b>{(h.before || h.after) && <> · {h.before} → {h.after}</>}</div>{h.reason && <div className="t-caption t-muted">Reason: {h.reason}</div>}<div className="t-caption t-muted">{h.actor} · {h.at}</div></div></div>))}
            </div>
          </div>
        </div>
      </div>
      {act === 'approve' && <ApproveModal v={v} flags={flags.map(f => f.title)} onClose={() => setAct(null)} />}
      {act === 'return' && <ReasonDialog title="Send back to fix" text={`${g?.name ?? 'The caregiver'} corrects it in the app and sends it again. ${c.coordinator} is told too. It comes back to you when it’s fixed.`} label="What needs fixing?" confirm="Send back" danger placeholder="For example: check-out time looks wrong, please confirm with the caregiver" onClose={() => setAct(null)} onConfirm={reason => {
        s.setVisits(x => x.map(y => y.id === v.id ? { ...y, approval: 'Sent back', returned: { reason, by: s.me.name, at: stampNow() } } : y))
        s.log({ type: 'Visit approval', action: 'Sent a visit back to fix', record, reason }); s.toast(`Sent back to ${g?.name ?? 'the caregiver'} to fix. ${c.coordinator} has been told.`); setAct(null)
      }} />}
      {(act === 'correct' || act === 'adjust') && <CorrectModal v={v} adjust={act === 'adjust'} onClose={() => setAct(null)} />}
      {act === 'keep' && <ReasonDialog title={`Keep ${g?.name} on this visit?`} text={`${g?.name} is not ready to work: ${g?.issue?.toLowerCase()}. Only the Agency Admin, a Care Supervisor or the Director of Nursing can make this exception.`} label="Why is this safe?" confirm="Make exception" placeholder="For example: certificate renewed yesterday, HR is uploading it today" onClose={() => setAct(null)} onConfirm={keepAnyway} />}
    </>
  )
}

/** Planned vs what the caregiver app recorded, with anything that needs a look. */
function ServiceRecord({ v, flags, planTasks }: { v: Visit; flags: ReturnType<typeof serviceFlags>; planTasks: string[] }) {
  const a = actualMins(v)
  const diff = (p: string, r?: string) => !r ? <span style={{ color: 'var(--status-danger)' }}>Missing</span> : mins(r) === mins(p) ? <span className="t-muted">Same</span> : <span style={{ color: Math.abs(mins(r) - mins(p)) > 15 ? 'var(--status-warning)' : 'var(--text-muted)' }}>{mins(r) > mins(p) ? '+' : '−'}{Math.abs(mins(r) - mins(p))} min</span>
  return (
    <div className="card">
      <CardHead title="What the caregiver app recorded" sub="Planned times compared with check-in and check-out." />
      <div className="card-body col" style={{ gap: 16 }}>
        {flags.length > 0 && v.approval !== 'Approved' && <div className="col" style={{ gap: 8 }}>
          {flags.map(f => <div key={f.key} className="row t-small" style={{ gap: 8, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 8, background: f.tone === 'danger' ? 'var(--status-danger-soft)' : 'var(--status-warning-soft)' }}>
            <TriangleAlert size={15} color={f.tone === 'danger' ? 'var(--status-danger)' : 'var(--status-warning)'} style={{ marginTop: 2 }} /><span><b>{f.title}.</b> {f.text}</span></div>)}
        </div>}
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th /><th>Planned</th><th>Recorded</th><th>Difference</th>{v.original && <th>Before correction</th>}</tr></thead>
          <tbody>
            <tr><td className="t-medium"><span className="row" style={{ gap: 6 }}><LogIn size={14} />Start</span></td><td>{v.start}</td><td>{v.checkIn ?? '—'}</td><td>{diff(v.start, v.checkIn)}</td>{v.original && <td className="t-muted">{v.original.checkIn ?? '—'}</td>}</tr>
            <tr><td className="t-medium"><span className="row" style={{ gap: 6 }}><LogOut size={14} />Finish</span></td><td>{v.end}</td><td>{v.checkOut ?? <span style={{ color: 'var(--status-danger)' }}>No check-out</span>}</td><td>{diff(v.end, v.checkOut)}</td>{v.original && <td className="t-muted">{v.original.checkOut ?? 'No check-out'}</td>}</tr>
            <tr><td className="t-medium"><span className="row" style={{ gap: 6 }}><Clock size={14} />Time spent</span></td><td>{hrs(plannedMins(v))}</td><td>{a !== null ? hrs(a) : '—'}</td><td>{a === null ? '—' : a === plannedMins(v) ? <span className="t-muted">Same</span> : `${a > plannedMins(v) ? '+' : '−'}${Math.abs(a - plannedMins(v))} min`}</td>{v.original && <td />}</tr>
          </tbody>
        </table></div>
        <dl className="kv" style={{ gridTemplateColumns: '130px 1fr' }}>
          <dt>Checked in from</dt><dd className="row" style={{ gap: 6, color: v.place && v.place !== 'At the client’s home' ? 'var(--status-warning)' : undefined }}><Navigation size={13} />{v.place ?? '—'}</dd>
          <dt>Tasks</dt><dd className="col" style={{ gap: 4 }}>{planTasks.length === 0 ? '—' : planTasks.map(t => { const done = (v.tasksDone ?? []).includes(t); return <span key={t} className="row" style={{ gap: 6, color: done ? undefined : 'var(--status-warning)' }}>{done ? <CheckCircle2 size={14} color="var(--status-success)" /> : <XCircle size={14} />}{t}{!done && ' — not done'}</span> })}{v.tasksNote && <span className="t-caption t-muted">Caregiver: “{v.tasksNote}”</span>}</dd>
          <dt>Caregiver’s note</dt><dd>{v.cgNote ? `“${v.cgNote}”` : <span className="t-muted">No note</span>}</dd>
        </dl>
      </div>
    </div>
  )
}

function ApproveModal({ v, flags, onClose }: { v: Visit; flags: string[]; onClose: () => void }) {
  const s = useStore()
  const [t, setT] = useState(''); const [tried, setTried] = useState(false)
  const bad = flags.length > 0 && t.trim().length < 5
  const save = () => {
    setTried(true); if (bad) return
    s.setVisits(x => x.map(y => y.id === v.id ? { ...y, approval: 'Approved', approvedBy: s.me.name, approvedAt: stampNow() } : y))
    s.log({ type: 'Visit approval', action: 'Approved a visit', record: `Visit #${v.id.slice(1)}`, reason: flags.length ? `${flags.join(', ')} — ${t.trim()}` : undefined })
    s.toast('Visit approved. It’s ready for billing and timesheets.'); onClose()
  }
  return (
    <Modal title="Approve this visit?" sub="Approved visits go to Finance for billing and the caregiver’s timesheet." onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={CheckCircle2} onClick={save}>Approve visit</Button></>}>
      {flags.length > 0 ? <>
        <AlertBanner tone="warning" title="You are approving with differences">{flags.join(' · ')}</AlertBanner>
        <Field label="Why is this OK?" required error={tried && bad ? 'Please write a short reason (at least 5 letters).' : undefined} helper="Saved with your name and the time."><Textarea autoFocus value={t} onChange={e => setT(e.target.value)} error={tried && bad} placeholder="For example: spoke to the family — the caregiver stayed the full time" /></Field>
      </> : <p className="t-secondary" style={{ margin: 0 }}>The times, place and tasks match the plan.</p>}
    </Modal>
  )
}

/** Correct the recorded times. The original times are always kept. After invoicing, this becomes an adjustment request to Finance. */
function CorrectModal({ v, adjust, onClose }: { v: Visit; adjust: boolean; onClose: () => void }) {
  const s = useStore()
  const [inAt, setIn] = useState(v.checkIn ?? v.start)
  const [outAt, setOut] = useState(v.checkOut ?? v.end)
  const [reason, setReason] = useState(''); const [tried, setTried] = useState(false)
  const badTime = !inAt || !outAt || outAt <= inAt
  const same = inAt === v.checkIn && outAt === v.checkOut
  const badReason = reason.trim().length < 5
  const record = `Visit #${v.id.slice(1)}`
  const before = `${v.checkIn ?? '—'}–${v.checkOut ?? 'no check-out'}`, after = `${inAt}–${outAt}`
  const save = () => {
    setTried(true); if (badTime || badReason || same) return
    if (adjust) {
      s.setVisits(x => x.map(y => y.id === v.id ? { ...y, adjustment: { reason: reason.trim(), by: s.me.name, at: stampNow(), before, after, status: 'Sent to Finance' } } : y))
      s.log({ type: 'Visit approval', action: 'Asked Finance for an adjustment', record, before, after, reason: reason.trim() })
      s.toast('Sent to Finance. The approved record stays as it is until they adjust it.'); onClose(); return
    }
    s.setVisits(x => x.map(y => y.id === v.id ? { ...y, checkIn: inAt, checkOut: outAt, original: y.original ?? { checkIn: y.checkIn, checkOut: y.checkOut }, approval: y.approval === 'Sent back' ? 'To review' : y.approval, returned: y.approval === 'Sent back' ? undefined : y.returned } : y))
    s.log({ type: 'Visit approval', action: v.approval === 'Approved' ? 'Corrected an approved visit' : 'Corrected visit times', record, before, after, reason: reason.trim() })
    s.toast(v.approval === 'Approved' ? 'Corrected. Finance will see the new times.' : v.approval === 'Sent back' ? 'Corrected. It’s back in “To review”.' : 'Times corrected. The original times are kept.'); onClose()
  }
  return (
    <Modal title={adjust ? 'Ask Finance for an adjustment' : v.approval === 'Approved' ? 'Correct an approved visit' : 'Correct the times'} sub={adjust ? 'This visit is already invoiced. Finance makes the change as an adjustment, so the invoice history stays right.' : 'The times the caregiver app recorded are kept and shown next to your correction.'} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>{adjust ? 'Send to Finance' : 'Save correction'}</Button></>}>
      <div className="grid g-2">
        <Field label="Started at" required><Input type="time" value={inAt} onChange={e => setIn(e.target.value)} error={tried && badTime} /></Field>
        <Field label="Finished at" required error={tried && badTime ? 'The finish must be after the start.' : undefined}><Input type="time" value={outAt} onChange={e => setOut(e.target.value)} error={tried && badTime} /></Field>
      </div>
      <div className="hint">Planned {v.start}–{v.end}. Recorded {before}.</div>
      {tried && same && <AlertBanner tone="warning" title="Nothing changed">Change at least one time.</AlertBanner>}
      <Field label="Why are you changing it?" required error={tried && badReason ? 'Please write a short reason (at least 5 letters).' : undefined} helper="Saved with your name and the time."><Textarea value={reason} onChange={e => setReason(e.target.value)} error={tried && badReason} placeholder="For example: caregiver forgot to check out — left at 16:00, confirmed by the client’s wife" /></Field>
    </Modal>
  )
}

/** Choose a caregiver. As Care Supervisor you can make an exception for someone who isn’t ready — but never double-book. */
function CaregiverPicker({ v, onDone, onCancel }: { v: Visit; onDone: () => void; onCancel: () => void }) {
  const s = useStore()
  const [only, setOnly] = useState(true)
  const [exc, setExc] = useState<string | null>(null)
  const options = useMemo(() => s.caregivers.filter(g => g.branch === v.branch && g.id !== v.caregiverId).map(g => ({ g, ck: checkCaregiver(g, v, s.visits) }))
    .sort((a, b) => a.ck.blocking.length - b.ck.blocking.length || b.ck.good.length - a.ck.good.length || a.ck.warnings.length - b.ck.warnings.length), [s.caregivers, s.visits, v])
  const list = options.filter(o => !only || !o.ck.blocking.length)
  const hidden = options.length - list.length
  const assign = (gid: string, reason?: string) => {
    const g = s.caregiver(gid)!
    const before = s.caregiver(v.caregiverId)?.name ?? 'No caregiver'
    s.setVisits(x => x.map(y => y.id === v.id ? { ...y, caregiverId: gid, status: y.status === 'Unassigned' ? 'Scheduled' : y.status, review: undefined, override: reason ? { reason, by: s.me.name, at: stampNow() } : undefined } : y))
    s.log({ type: reason ? 'Override' : 'Schedule', action: reason ? 'Assigned a caregiver (exception)' : v.caregiverId ? 'Changed caregiver' : 'Assigned a caregiver', record: `Visit #${v.id.slice(1)}`, before, after: g.name, reason })
    s.toast(`${g.name} is on the visit. They, the coordinator and the family have been told.`); onDone()
  }
  const soft = (w: string[]) => w.filter(x => !x.startsWith('Has not'))
  const clash = (b: string[]) => b.some(x => x.startsWith('Already on another visit'))
  const excG = s.caregiver(exc)
  const excCk = options.find(o => o.g.id === exc)?.ck
  return (
    <div className="card" style={{ borderColor: 'var(--border-focus)' }}>
      <CardHead title={v.caregiverId ? 'Change caregiver' : 'Find a caregiver'} sub="Best matches first. You can make an exception for someone with a red reason, with a written reason — but nobody can be on two visits at once." action={<div className="row">
        <label className="check t-small"><input type="checkbox" checked={only} onChange={e => setOnly(e.target.checked)} />Only who can do it</label>
        <Button size="sm" variant="secondary" onClick={onCancel}>Close</Button></div>} />
      <div className="card-body">
        {list.length === 0 ? <div className="col" style={{ gap: 8 }}><div className="t-medium">Nobody in {s.branchName(v.branch)} is free and ready for this visit.</div><button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setOnly(false)}>Show everyone and why</button></div> : list.map(({ g, ck }) => {
          const blocked = ck.blocking.length > 0
          return (
            <div key={g.id} className="list-row" style={{ alignItems: 'flex-start', opacity: blocked ? .85 : 1 }}>
              <Avatar name={g.name} />
              <div className="grow col" style={{ gap: 3 }}>
                <div className="row wrap" style={{ gap: 8 }}><Link to={`/caregivers/${g.id}?from=/visits/${v.id}`} className="t-medium" style={{ color: 'var(--text-primary)' }}>{g.name}</Link><span className="t-caption t-muted">{g.type} · {g.phone}</span></div>
                {ck.blocking.map(b => <span key={b} className="row t-caption" style={{ gap: 4, color: 'var(--status-danger)' }}><Ban size={12} />{b}</span>)}
                {ck.warnings.filter(w => !blocked || !w.startsWith('Has not')).map(w => <span key={w} className="row t-caption" style={{ gap: 4, color: 'var(--status-warning)' }}><TriangleAlert size={12} />{w}</span>)}
                {!blocked && ck.good.map(w => <span key={w} className="row t-caption" style={{ gap: 4, color: 'var(--status-success)' }}><CheckCircle2 size={12} />{w}</span>)}
              </div>
              <Chip tone={blocked ? 'danger' : soft(ck.warnings).length ? 'warning' : 'success'}>{blocked ? 'Blocked' : soft(ck.warnings).length ? 'Check first' : 'Good match'}</Chip>
              {!blocked ? <Button size="sm" onClick={() => assign(g.id)}>Assign</Button> : !clash(ck.blocking) ? <Button size="sm" variant="secondary" icon={ShieldAlert} onClick={() => setExc(g.id)}>Assign anyway</Button> : null}
            </div>)
        })}
        {only && hidden > 0 && <button className="link-btn mt-2" onClick={() => setOnly(false)}>Show {hidden} who are blocked, and why</button>}
      </div>
      {exc && excG && <ReasonDialog title={`Make an exception for ${excG.name}?`} text={`Blocked because: ${excCk?.blocking.join('; ').toLowerCase()}. Your reason is saved and shown on the visit.`} label="Why is this safe?" confirm="Assign anyway" placeholder="For example: trained last week, certificate is with HR" onClose={() => setExc(null)} onConfirm={r => { setExc(null); assign(excG.id, r) }} />}
    </div>
  )
}
