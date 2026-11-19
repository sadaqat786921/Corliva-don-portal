import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Phone, UserPlus, MessageSquareText, RefreshCw, CheckCircle2, LogIn, LogOut, ChevronRight } from 'lucide-react'
import { useStore } from '../data/store'
import { TODAY, Visit, nowHM } from '../data/seed'
import { LiveState, liveState, minutesLate } from '../data/schedule'
import { Avatar, Button, CardHead, Chip, ChipTone, EmptyState, Field, Modal, PageHead, StatTile, Textarea } from '../components/ui'

const tone = (s: LiveState): ChipTone => s === 'Done' ? 'success' : s === 'In progress' ? 'info' : s === 'Late' || s === 'No caregiver' ? 'danger' : s === 'Due soon' ? 'warning' : 'neutral'
const GROUPS: { title: string; states: LiveState[]; sub: string }[] = [
  { title: 'Needs you now', states: ['Late', 'No caregiver'], sub: 'Late check-ins and visits with nobody assigned.' },
  { title: 'In progress', states: ['In progress'], sub: 'The caregiver has checked in.' },
  { title: 'Coming up', states: ['Due soon', 'Later today'], sub: 'Not started yet.' },
  { title: 'Done', states: ['Done'], sub: 'Checked out. These come to you in Visit approvals.' },
]

export default function Today() {
  const s = useStore()
  const nav = useNavigate()
  const [tick, setTick] = useState(nowHM())
  const [act, setAct] = useState<null | { a: 'update'; v: Visit }>(null)
  const open = (id: string, assign = false) => nav(`/visits/${id}?from=/today${assign ? '&assign=1' : ''}`)
  useEffect(() => { const t = setInterval(() => setTick(nowHM()), 60000); return () => clearInterval(t) }, [])
  const today = s.visits.filter(v => s.inBranch(v.branch) && v.date === TODAY && v.status !== 'Cancelled').sort((a, b) => a.start.localeCompare(b.start))
  const by = (st: LiveState[]) => today.filter(v => st.includes(liveState(v)))
  const n = (st: LiveState) => today.filter(v => liveState(v) === st).length

  return (
    <>
      <PageHead title="Today’s visits" crumb="Today’s visits" sub={`Live check-ins for ${s.branchName(s.branch)}. Late is ${s.rules.lateArrivalMins} minutes after the start time. Coordinators follow up late visits; click a visit to see everything about it.`} actions={<Button variant="secondary" icon={RefreshCw} onClick={() => setTick(nowHM())}>Updated {tick}</Button>} />
      <div className="grid g-4">
        <StatTile icon={Clock} tone="danger" label="Late or no caregiver" value={n('Late') + n('No caregiver')} foot="Need you now" />
        <StatTile icon={LogIn} tone="info" label="In progress" value={n('In progress')} foot="Checked in" />
        <StatTile icon={Clock} tone="warning" label="Coming up" value={n('Due soon') + n('Later today')} foot={`${n('Due soon')} in the next hour`} />
        <StatTile icon={CheckCircle2} tone="success" label="Done" value={n('Done')} foot="Checked out" />
      </div>
      {today.length === 0 ? <div className="card"><EmptyState icon={Clock} tone="neutral" title="No visits today" text="Nothing is planned for today in these branches." /></div> : GROUPS.map(gr => {
        const list = by(gr.states)
        if (!list.length) return null
        return (
          <div key={gr.title} className="card">
            <CardHead title={`${gr.title} (${list.length})`} sub={gr.sub} />
            <div className="card-body">
              {list.map(v => {
                const st = liveState(v); const c = s.client(v.clientId); const g = s.caregiver(v.caregiverId)
                return (
                  <div key={v.id} className="list-row clickable-row" role="button" tabIndex={0} onClick={() => open(v.id)} onKeyDown={e => { if (e.key === 'Enter') open(v.id) }} style={{ alignItems: 'flex-start', cursor: 'pointer' }}>
                    <div style={{ width: 92 }}><div className="t-strong">{v.start}</div><div className="t-caption t-muted">to {v.end}</div></div>
                    <div className="grow col" style={{ gap: 4 }}>
                      <div className="row wrap" style={{ gap: 8 }}><span className="t-medium">{c?.name}</span><span className="t-caption t-muted">{v.service}</span></div>
                      <div className="row t-small" style={{ gap: 8 }}>{g ? <><Avatar name={g.name} size="sm" />{g.name}<span className="row t-caption t-muted" style={{ gap: 4 }}><Phone size={11} />{g.phone}</span></> : <span style={{ color: 'var(--status-danger)' }}>No caregiver</span>}</div>
                      {(v.checkIn || v.checkOut) && <div className="row t-caption t-muted" style={{ gap: 12 }}>{v.checkIn && <span className="row" style={{ gap: 4 }}><LogIn size={12} />In {v.checkIn}</span>}{v.checkOut && <span className="row" style={{ gap: 4 }}><LogOut size={12} />Out {v.checkOut}</span>}</div>}
                      {st === 'Late' && <div className="t-caption" style={{ color: 'var(--status-danger)' }}>{v.end <= nowHM() ? `No check-in at all — this visit should have finished at ${v.end}. Check with the caregiver and the client; if it was missed, report it as an incident.` : `${minutesLate(v)} minutes past the start time, not checked in.`}</div>}
                      {v.coverNote && <div className="t-caption" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '6px 8px' }}><b>Update:</b> {v.coverNote}</div>}
                    </div>
                    <Chip tone={tone(st)}>{st}</Chip>
                    <div className="row" style={{ gap: 6 }} onClick={e => e.stopPropagation()}>
                      {st === 'Late' && <Button size="sm" variant="secondary" icon={MessageSquareText} onClick={() => setAct({ a: 'update', v })}>Add update</Button>}
                      {st === 'Late' && <Button size="sm" icon={UserPlus} onClick={() => open(v.id, true)}>Send someone else</Button>}
                      {st === 'No caregiver' && <Button size="sm" icon={UserPlus} onClick={() => open(v.id, true)}>Find caregiver</Button>}
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" style={{ alignSelf: 'center' }} />
                  </div>)
              })}
            </div>
          </div>)
      })}
      {act?.a === 'update' && <UpdateModal v={act.v} onClose={() => setAct(null)} />}
    </>
  )
}

function UpdateModal({ v, onClose }: { v: Visit; onClose: () => void }) {
  const s = useStore()
  const g = s.caregiver(v.caregiverId)
  const [t, setT] = useState(''); const [tried, setTried] = useState(false); const bad = t.trim().length < 3
  return <Modal title={`Update on ${g?.name ?? 'the caregiver'}`} sub={`Call ${g?.phone ?? ''}, then write what they said. The family app shows “running late” if you tell the family.`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => {
    setTried(true); if (bad) return
    s.setVisits(x => x.map(y => y.id === v.id ? { ...y, coverNote: `${t.trim()} (${nowHM()})` } : y))
    s.log({ type: 'Schedule', action: 'Recorded a late update', record: `Visit #${v.id.slice(1)}`, reason: t.trim() }); s.toast('Update saved'); onClose()
  }}>Save update</Button></>}>
    <Field label="What did they say?" required error={tried && bad ? 'Please write a short update.' : undefined}><Textarea autoFocus value={t} onChange={e => setT(e.target.value)} placeholder="For example: stuck in traffic, there in 10 minutes. Family told." error={tried && bad} /></Field>
  </Modal>
}
