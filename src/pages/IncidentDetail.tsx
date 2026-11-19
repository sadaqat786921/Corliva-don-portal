import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, UserCheck, Lock, Clock, Search, CheckCircle2, Send, CalendarDays, Plus, Play, ListChecks, RotateCcw, Archive, Pencil, Save, Square, CheckSquare, ChevronRight } from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { Incident, IncidentStatus, TODAY, addDays } from '../data/seed'
import { AlertBanner, Avatar, Button, CardHead, Chip, EmptyState, Field, Input, Modal, ReasonDialog, Select, Textarea, Toggle } from '../components/ui'
import { sevTone, stTone, stamp } from './Incidents'

const STEPS: { st: IncidentStatus; help: string }[] = [
  { st: 'Reported', help: 'Someone told us what happened.' },
  { st: 'Under review', help: 'You are finding out more.' },
  { st: 'Action required', help: 'Actions agreed and being done.' },
  { st: 'Resolved', help: 'The actions are done.' },
  { st: 'Closed', help: 'Checked and closed by you.' },
]
const long = (d: string) => fmtDate(d, { weekday: 'short', day: 'numeric', month: 'long' })

export default function IncidentDetail() {
  const { id } = useParams()
  const s = useStore()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const from = params.get('from') ?? '/incidents'
  const [t, setT] = useState('')
  const [act, setAct] = useState<null | 'resolve' | 'close' | 'reopen' | 'owner' | 'severity' | 'privacy' | 'action' | 'take'>(null)
  const [findings, setFindings] = useState<string | null>(null)
  const i = s.incidents.find(x => x.id === id)
  if (!i || !s.inBranch(i.branch)) return <div className="card"><EmptyState icon={Search} tone="neutral" title="We can’t show this incident" text="It may be in a branch you’ve filtered out, or the link is old." action={<Button onClick={() => nav('/incidents')}>All incidents</Button>} /></div>

  const at = STEPS.findIndex(x => x.st === i.status)
  const client = s.clients.find(c => c.name === i.client)
  const cg = s.caregivers.find(g => g.name === i.caregiver)
  const visitsThatDay = client ? s.visits.filter(v => v.clientId === client.id && v.date === i.date) : []
  const closed = i.status === 'Closed'
  const open = !['Resolved', 'Closed'].includes(i.status)
  const overdue = open && i.due < TODAY
  const openActions = i.actions.filter(a => !a.done)
  const [first, ...rest] = i.notes
  const record = `${i.id} ${i.title}`
  const update = (patch: Partial<Incident>, action: string, extra: { before?: string; after?: string; reason?: string } = {}, note?: string) => {
    s.setIncidents(x => x.map(y => y.id === i.id ? { ...y, ...patch, notes: note ? [...y.notes, { by: s.me.name, at: stamp(), text: note }] : y.notes } : y))
    s.log({ type: 'Incident', action, record, ...extra })
  }
  const move = (to: IncidentStatus, note: string) => { update({ status: to }, `Moved to ${to}`, { before: i.status, after: to }, note); s.toast(`${i.id} is now “${to}”.`) }
  const addNote = () => {
    if (t.trim().length < 3) return
    s.setIncidents(x => x.map(y => y.id === i.id ? { ...y, notes: [...y.notes, { by: s.me.name, at: stamp(), text: t.trim() }] } : y))
    s.toast('Note added.'); setT('')
  }
  const toggleAction = (aid: string) => {
    const a = i.actions.find(x => x.id === aid)!
    s.setIncidents(x => x.map(y => y.id === i.id ? { ...y, actions: y.actions.map(z => z.id === aid ? { ...z, done: !z.done, doneAt: !z.done ? stamp() : undefined } : z) } : y))
    s.log({ type: 'Incident', action: a.done ? 'Action marked not done' : 'Action done', record, after: a.text })
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Link to={from} className="row t-small t-medium" style={{ gap: 6, marginBottom: 8 }}><ArrowLeft size={15} />{from === '/' ? 'My work' : 'Incidents'}</Link>
          <div className="row wrap" style={{ gap: 10 }}>
            <h1 className="t-h1">{i.title}</h1>
            <Chip tone={stTone(i.status)}>{i.status}</Chip><Chip tone={sevTone(i.severity)}>{i.severity} severity</Chip>
            {i.sensitive && <Chip tone="neutral"><Lock size={11} style={{ verticalAlign: -1 }} /> Private</Chip>}
          </div>
          <div className="t-small t-muted" style={{ marginTop: 4 }}>{i.id} · {i.category} · happened {fmtDate(i.date, { weekday: 'long', day: 'numeric', month: 'long' })} · reported by {i.reportedBy}</div>
          <div className="crumbs"><Link to="/">Home</Link><span>/</span><Link to="/incidents">Incidents</Link><span>/</span><span>{i.id}</span></div>
        </div>
        <div className="actions">
          {!closed && i.owner !== s.me.name && <Button variant="secondary" icon={UserCheck} onClick={() => setAct('take')}>Take over</Button>}
          {i.status === 'Reported' && <Button icon={Play} onClick={() => move('Under review', 'Started looking into this.')}>Start review</Button>}
          {i.status === 'Under review' && <Button variant="secondary" icon={ListChecks} disabled={!openActions.length} title={openActions.length ? '' : 'Add at least one action first'} onClick={() => move('Action required', `Actions agreed: ${openActions.map(a => a.text).join('; ')}.`)}>Actions agreed</Button>}
          {(i.status === 'Under review' || i.status === 'Action required') && <Button icon={CheckCircle2} disabled={openActions.length > 0} title={openActions.length ? 'Finish every action first' : ''} onClick={() => setAct('resolve')}>Mark resolved</Button>}
          {i.status === 'Resolved' && <><Button variant="secondary" icon={RotateCcw} onClick={() => setAct('reopen')}>Reopen</Button><Button icon={Archive} onClick={() => setAct('close')}>Close incident</Button></>}
        </div>
      </div>

      {overdue && <AlertBanner tone="danger" title={`Past the target date (${fmtDate(i.due, { day: 'numeric', month: 'short' })})`}>Move it on, or change the target date with a reason.</AlertBanner>}
      {i.severity === 'High' && open && i.owner !== s.me.name && <AlertBanner tone="danger" title="High severity — sent up to you">{i.owner} owns it. Keep an eye on it here, add notes or actions, or take it over.</AlertBanner>}
      {i.status === 'Reported' && <AlertBanner tone="info" title="New — not started yet">Check the severity and who can see it, then start the review.</AlertBanner>}
      {i.sensitive && <AlertBanner tone="info" title="Private incident">Only approved roles can see this. It is hidden from coordinators who didn’t report it, caregivers and families.</AlertBanner>}
      {(i.status === 'Under review' || i.status === 'Action required') && openActions.length > 0 && <AlertBanner tone="warning" title={`${openActions.length} action${openActions.length > 1 ? 's' : ''} still to do`}>Tick each one off when it’s done. You can mark the incident resolved once they’re all done.</AlertBanner>}
      {closed && <AlertBanner tone="success" title="Closed">It’s kept in the history and reports and can’t be changed.</AlertBanner>}

      <div className="card card-pad">
        <div className="stepper">
          {STEPS.map((x, k) => { const state = k < at || closed ? 'done' : k === at ? 'current' : 'todo'; return (
            <div key={x.st} className={`stp ${state}`} style={{ cursor: 'default' }}>
              <span className="stp-dot">{state === 'done' ? <CheckCircle2 size={15} /> : k + 1}</span>
              <span className="stp-txt"><span className="stp-name">{x.st}</span><span className="stp-sub">{x.help}</span></span>
            </div>) })}
        </div>
      </div>

      <div className="grid g-main-side" style={{ alignItems: 'start' }}>
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <CardHead title="What happened" sub={first ? `${first.by} · ${first.at}` : undefined} />
            <div className="card-body">{first ? <div style={{ fontSize: 15 }}>{first.text}</div> : <div className="t-small t-muted">No description yet.</div>}</div>
          </div>

          <div className="card">
            <CardHead title="What you found" sub="Why it happened. Write it as you find out more." action={!closed && findings === null && <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setFindings(i.findings)}>{i.findings ? 'Edit' : 'Add'}</Button>} />
            <div className="card-body">
              {findings !== null ? <div className="col" style={{ gap: 8 }}>
                <Textarea autoFocus value={findings} onChange={e => setFindings(e.target.value)} placeholder="For example: the floor was wet and there was nothing to hold" />
                <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}><Button size="sm" variant="secondary" onClick={() => setFindings(null)}>Cancel</Button><Button size="sm" icon={Save} disabled={findings.trim() === i.findings} onClick={() => { update({ findings: findings.trim() }, 'Updated what was found', { after: findings.trim() }); s.toast('Saved.'); setFindings(null) }}>Save</Button></div>
              </div> : i.findings ? <div className="t-small" style={{ whiteSpace: 'pre-wrap' }}>{i.findings}</div> : <div className="t-small t-muted">Nothing written yet.</div>}
            </div>
          </div>

          <div className="card">
            <CardHead title="Actions" sub="What will be done to put it right and stop it happening again." action={!closed && i.status !== 'Resolved' && <Button size="sm" icon={Plus} onClick={() => setAct('action')}>Add action</Button>} />
            <div className="card-body">
              {i.actions.length === 0 ? <div className="t-small t-muted">No actions yet.</div> : i.actions.map(a => (
                <div key={a.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                  <button className="icon-btn" style={{ border: 0 }} disabled={closed || i.status === 'Resolved'} aria-label={a.done ? 'Mark not done' : 'Mark done'} onClick={() => toggleAction(a.id)}>{a.done ? <CheckSquare size={18} color="var(--status-success)" /> : <Square size={18} />}</button>
                  <div className="grow"><div className="t-small t-medium" style={{ textDecoration: a.done ? 'line-through' : undefined, color: a.done ? 'var(--text-muted)' : undefined }}>{a.text}</div><div className="t-caption t-muted">{a.who} · by {fmtDate(a.due, { day: 'numeric', month: 'short' })}{a.done && a.doneAt ? ` · done ${a.doneAt}` : ''}</div></div>
                  <Chip tone={a.done ? 'success' : a.due < TODAY ? 'danger' : 'warning'}>{a.done ? 'Done' : a.due < TODAY ? 'Late' : 'To do'}</Chip>
                </div>))}
            </div>
          </div>

          {(i.resolution || i.closingNote) && <div className="card">
            <CardHead title="Outcome" />
            <div className="card-body"><dl className="kv">
              {i.resolution && <><dt>How it was resolved</dt><dd>{i.resolution}</dd></>}
              {i.closingNote && <><dt>Closing note</dt><dd>{i.closingNote}</dd></>}
            </dl></div>
          </div>}

          <div className="card">
            <CardHead title="Notes and updates" sub="Everyone working on this incident sees these. Nothing is removed." />
            <div className="card-body col" style={{ gap: 14 }}>
              {rest.length === 0 ? <div className="t-small t-muted">No follow-up notes yet.</div> : <div className="timeline">{rest.map((n, k) => (
                <div key={k} className="timeline-item"><Avatar name={n.by} size="sm" /><div><div className="t-small">{n.text}</div><div className="t-caption t-muted row" style={{ gap: 4 }}><Clock size={11} />{n.by} · {n.at}</div></div></div>))}</div>}
              {!closed ? <>
                <div className="divider" />
                <Textarea value={t} onChange={e => setT(e.target.value)} placeholder="Add an update — e.g. spoke to the family, they’ve booked a GP visit" />
                <div className="row between"><span className="t-caption t-muted">The reporter and the client’s coordinator see your notes.</span><Button icon={Send} disabled={t.trim().length < 3} onClick={addNote}>Add note</Button></div>
              </> : <div className="row t-caption t-muted" style={{ gap: 6 }}><Lock size={12} />Closed incidents can’t be changed.</div>}
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <CardHead title="Who handles this" action={!closed && <button className="link-btn" onClick={() => setAct('owner')}>Change</button>} />
            <div className="card-body col" style={{ gap: 10 }}>
              <div className="row" style={{ gap: 10 }}><Avatar name={i.owner} /><div><div className="t-medium">{i.owner === s.me.name ? `${i.owner} (you)` : i.owner}</div><div className="t-caption t-muted">Owner</div></div></div>
              <div className="t-small"><b>Target date:</b> <span style={{ color: overdue ? 'var(--status-danger)' : undefined }}>{long(i.due)}</span></div>
            </div>
          </div>
          <div className="card">
            <CardHead title="Severity and who can see it" />
            <div className="card-body col" style={{ gap: 12 }}>
              <div className="row between"><span className="row" style={{ gap: 8 }}><Chip tone={sevTone(i.severity)}>{i.severity}</Chip><span className="t-small t-muted">severity</span></span>{!closed && <button className="link-btn" onClick={() => setAct('severity')}>Change</button>}</div>
              <div className="row between"><span className="t-small">Private — approved roles only</span><Toggle on={i.sensitive} disabled={closed} label="Private incident" onChange={() => setAct('privacy')} /></div>
            </div>
          </div>
          <div className="card">
            <CardHead title="Details" />
            <div className="card-body">
              <dl className="kv" style={{ gridTemplateColumns: '110px 1fr' }}>
                <dt>Type</dt><dd>{i.category}</dd>
                <dt>Client</dt><dd>{client ? <Link to={`/clients/${client.id}`}>{i.client}</Link> : i.client}</dd>
                <dt>Caregiver</dt><dd>{cg ? <Link to={`/caregivers/${cg.id}`}>{cg.name}</Link> : i.caregiver ?? '—'}</dd>
                <dt>Reported by</dt><dd>{i.reportedBy}</dd>
                <dt>Happened</dt><dd>{fmtDate(i.date, { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
                <dt>Branch</dt><dd>{s.branchName(i.branch)}</dd>
              </dl>
            </div>
          </div>
          {visitsThatDay.length > 0 && <div className="card">
            <CardHead title="Visits that day" />
            <div className="card-body">{visitsThatDay.map(v => (
              <button key={v.id} className="list-row clickable-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/visits/${v.id}?from=/incidents/${i.id}`)}>
                <CalendarDays size={16} color="var(--text-muted)" /><div className="grow"><div className="t-small t-medium">{v.start}–{v.end} · {v.service}</div><div className="t-caption t-muted">{s.caregiver(v.caregiverId)?.name ?? 'No caregiver'} · {v.status}</div></div><ChevronRight size={16} color="var(--text-muted)" />
              </button>))}</div>
          </div>}
        </div>
      </div>

      {act === 'action' && <ActionModal i={i} onClose={() => setAct(null)} onSave={a => { update({ actions: [...i.actions, a] }, 'Added an action', { after: `${a.text} · ${a.who}` }); s.toast(a.who === s.me.name ? "Action added." : `Action added. ${a.who} has been told.`); setAct(null) }} />}
      {act === 'resolve' && <ReasonDialog title="Mark as resolved?" text="Say how it was put right. You close it once you’re happy it’s sorted." label="How was it resolved?" confirm="Mark resolved" placeholder="For example: grab rail fitted and care plan updated; family happy" onClose={() => setAct(null)} onConfirm={r => { update({ status: 'Resolved', resolution: r }, 'Moved to Resolved', { before: i.status, after: 'Resolved', reason: r }); s.toast(`${i.id} is resolved.`); setAct(null) }} />}
      {act === 'close' && <ReasonDialog title="Close this incident?" text="Closed incidents can’t be changed. Everything is kept for reports." label="Closing note" confirm="Close incident" placeholder="For example: no further falls in two weeks" onClose={() => setAct(null)} onConfirm={r => { update({ status: 'Closed', closingNote: r }, 'Closed the incident', { before: i.status, after: 'Closed', reason: r }); s.toast(`${i.id} is closed.`); setAct(null) }} />}
      {act === 'reopen' && <ReasonDialog title="Reopen this incident?" text="It goes back to “Under review”." confirm="Reopen" placeholder="For example: family say it happened again" onClose={() => setAct(null)} onConfirm={r => { update({ status: 'Under review' }, 'Reopened the incident', { before: i.status, after: 'Under review', reason: r }, `Reopened: ${r}`); s.toast(`${i.id} is open again.`); setAct(null) }} />}
      {act === 'privacy' && <ReasonDialog title={i.sensitive ? 'Make this incident visible to the team?' : 'Make this incident private?'} text={i.sensitive ? 'Coordinators working with this client will be able to see it.' : 'Only approved roles will be able to see it.'} confirm={i.sensitive ? 'Make visible' : 'Make private'} placeholder="For example: involves a safeguarding concern" onClose={() => setAct(null)} onConfirm={r => { update({ sensitive: !i.sensitive }, i.sensitive ? 'Made the incident visible' : 'Made the incident private', { reason: r }); s.toast('Saved.'); setAct(null) }} />}
      {act === 'take' && <ReasonDialog title="Take over this incident?" text={`You become the owner. ${i.owner} is told and can still add notes.`} confirm="Take over" placeholder="For example: safeguarding concern — I’ll lead this one" onClose={() => setAct(null)} onConfirm={r => { update({ owner: s.me.name }, 'Took over the incident', { before: i.owner, after: s.me.name, reason: r }); s.toast(`You now own ${i.id}.`); setAct(null) }} />}
      {act === 'severity' && <SeverityModal i={i} onClose={() => setAct(null)} onSave={(sev, r) => { update({ severity: sev }, 'Changed severity', { before: i.severity, after: sev, reason: r }); s.toast(`Severity is now ${sev.toLowerCase()}.`); setAct(null) }} />}
      {act === 'owner' && <OwnerModal i={i} onClose={() => setAct(null)} onSave={(owner, due, r) => { update({ owner, due }, 'Changed owner or target date', { before: `${i.owner} · ${long(i.due)}`, after: `${owner} · ${long(due)}`, reason: r }); s.toast('Saved.'); setAct(null) }} />}
    </>
  )
}

function ActionModal({ i, onClose, onSave }: { i: Incident; onClose: () => void; onSave: (a: Incident['actions'][number]) => void }) {
  const s = useStore()
  const client = s.clients.find(c => c.name === i.client)
  const who = Array.from(new Set([s.me.name, client?.coordinator, i.caregiver, ...(client?.people.filter(p => p.representative).map(p => `${p.name} (family)`) ?? [])].filter(Boolean) as string[]))
  const [f, setF] = useState({ text: '', who: who[0], due: addDays(2) })
  const [tried, setTried] = useState(false)
  const bad = f.text.trim().length < 5, badDate = !f.due || f.due < TODAY
  return (
    <Modal title="Add an action" sub="Something that must be done. It’s ticked off when done." onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => { setTried(true); if (!bad && !badDate) onSave({ id: 'a' + Date.now(), text: f.text.trim(), who: f.who, due: f.due, done: false }) }}>Add action</Button></>}>
      <Field label="What needs doing?" required error={tried && bad ? 'Please describe the action.' : undefined}><Input autoFocus value={f.text} onChange={e => setF({ ...f, text: e.target.value })} placeholder="For example: fit a grab rail by the shower" error={tried && bad} /></Field>
      <div className="grid g-2">
        <Field label="Who does it?" required><Select value={f.who} onChange={e => setF({ ...f, who: e.target.value })} options={who} /></Field>
        <Field label="By when?" required error={tried && badDate ? 'Choose today or later.' : undefined}><Input type="date" min={TODAY} value={f.due} onChange={e => setF({ ...f, due: e.target.value })} error={tried && badDate} /></Field>
      </div>
    </Modal>
  )
}

function SeverityModal({ i, onClose, onSave }: { i: Incident; onClose: () => void; onSave: (s: Incident['severity'], r: string) => void }) {
  const [sev, setSev] = useState<Incident['severity']>(i.severity)
  const [r, setR] = useState(''); const [tried, setTried] = useState(false); const bad = r.trim().length < 5
  return (
    <Modal title="Change severity" sub={`Now: ${i.severity}. Reported as ${i.severity.toLowerCase()} by ${i.reportedBy}.`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={sev === i.severity} onClick={() => { setTried(true); if (!bad) onSave(sev, r.trim()) }}>Save</Button></>}>
      <Field label="Severity" required><Select value={sev} onChange={e => setSev(e.target.value as Incident['severity'])} options={['Low', 'Medium', 'High']} /></Field>
      <Field label="Why?" required error={tried && bad ? 'Please write a short reason (at least 5 letters).' : undefined}><Textarea value={r} onChange={e => setR(e.target.value)} error={tried && bad} placeholder="For example: no injury, family not worried" /></Field>
    </Modal>
  )
}

function OwnerModal({ i, onClose, onSave }: { i: Incident; onClose: () => void; onSave: (owner: string, due: string, r: string) => void }) {
  const s = useStore()
  const owners = s.users.filter(u => (u.role === 'Care Supervisor' || u.role === 'Director of Nursing' || u.role === 'Agency Admin') && u.status === 'Active').map(u => ({ value: u.name, label: `${u.name} · ${u.role}` }))
  const [owner, setOwner] = useState(i.owner); const [due, setDue] = useState(i.due)
  const [r, setR] = useState(''); const [tried, setTried] = useState(false); const bad = r.trim().length < 5
  const same = owner === i.owner && due === i.due
  return (
    <Modal title="Owner and target date" sub="Only a Care Supervisor, the Director of Nursing or the Agency Admin can own an incident." onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={same} onClick={() => { setTried(true); if (!bad) onSave(owner, due, r.trim()) }}>Save</Button></>}>
      <div className="grid g-2">
        <Field label="Owner" required><Select value={owner} onChange={e => setOwner(e.target.value)} options={owners} /></Field>
        <Field label="Target date" required><Input type="date" min={TODAY} value={due} onChange={e => setDue(e.target.value)} /></Field>
      </div>
      <Field label="Why?" required error={tried && bad ? 'Please write a short reason (at least 5 letters).' : undefined}><Textarea value={r} onChange={e => setR(e.target.value)} error={tried && bad} placeholder="For example: waiting for the family to fit the rail" /></Field>
    </Modal>
  )
}
