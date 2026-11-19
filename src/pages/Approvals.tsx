import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ChevronRight, ClipboardCheck, TriangleAlert, Ban } from 'lucide-react'
import { useStore, fmtDate, stampNow } from '../data/store'
import { TODAY, Visit } from '../data/seed'
import { planForVisit } from '../data/clients'
import { actualMins, hrs, plannedMins, serviceFlags } from '../data/review'
import { AlertBanner, Button, Chip, ConfirmDialog, EmptyState, PageHead, Pager, Tabs, usePaged } from '../components/ui'

type Tab = 'To review' | 'Sent back' | 'Approved'

export default function Approvals() {
  const s = useStore()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (['To review', 'Sent back', 'Approved'].includes(params.get('tab') ?? '') ? params.get('tab') : 'To review') as Tab
  const [only, setOnly] = useState('All')
  const [picked, setPicked] = useState<string[]>([])
  const [confirm, setConfirm] = useState(false)
  const flagsOf = (v: Visit) => serviceFlags(v, planForVisit(v, s.carePlans), s.rules.lateArrivalMins)
  const all = useMemo(() => s.visits.filter(v => s.inBranch(v.branch) && v.approval).map(v => ({ v, flags: flagsOf(v) })), [s.visits, s.carePlans, s.branch])
  const rows = all.filter(x => x.v.approval === tab && (only === 'All' || (only === 'With something to look at' ? x.flags.length > 0 : x.flags.length === 0)))
    .sort((a, b) => tab === 'To review' ? (b.flags.length - a.flags.length) || (a.v.date + a.v.start).localeCompare(b.v.date + b.v.start) : (b.v.date + b.v.start).localeCompare(a.v.date + a.v.start))
  const pg = usePaged(rows, 10)
  const clean = rows.filter(x => !x.flags.length).map(x => x.v.id)
  const count = (t: Tab) => all.filter(x => x.v.approval === t).length
  const setTab = (t: Tab) => { setParams({ tab: t }, { replace: true }); setPicked([]); pg.setPage(1) }

  const approveMany = () => {
    const ids = picked.filter(id => clean.includes(id))
    s.setVisits(x => x.map(v => ids.includes(v.id) ? { ...v, approval: 'Approved', approvedBy: s.me.name, approvedAt: stampNow() } : v))
    ids.forEach(id => s.log({ type: 'Visit approval', action: 'Approved a visit', record: `Visit #${id.slice(1)}` }))
    s.toast(`${ids.length} visit${ids.length > 1 ? 's' : ''} approved. They are ready for billing and timesheets.`)
    setPicked([]); setConfirm(false)
  }

  return (
    <>
      <PageHead title="Visit approvals" crumb="Visit approvals" sub="Care Supervisors usually check these — you can step in. Check finished visits against what was planned, then approve them. Approved visits go to Finance for billing and timesheets. Click a visit to see everything the caregiver app recorded." />
      <div className="card">
        <div style={{ padding: '0 16px' }}><Tabs value={tab} onChange={setTab} tabs={[{ id: 'To review', label: 'To review', count: count('To review') }, { id: 'Sent back', label: 'Sent back to fix', count: count('Sent back') }, { id: 'Approved', label: 'Approved', count: count('Approved') }]} /></div>
        <div className="toolbar">
          <select className="select-sm" aria-label="Show" value={only} onChange={e => { setOnly(e.target.value); setPicked([]) }}>{['All', 'With something to look at', 'Nothing to look at'].map(o => <option key={o}>{o}</option>)}</select>
          <span className="grow" />
          {tab === 'To review' && <>
            <span className="t-caption t-muted">{picked.length ? `${picked.length} selected` : 'Tick visits with nothing to look at to approve them together'}</span>
            <Button size="sm" variant="secondary" disabled={!clean.length} onClick={() => setPicked(picked.length === clean.length ? [] : clean)}>{picked.length === clean.length && clean.length ? 'Clear' : `Select all with nothing to look at (${clean.length})`}</Button>
            <Button size="sm" icon={CheckCircle2} disabled={!picked.length} onClick={() => setConfirm(true)}>Approve selected</Button>
          </>}
        </div>
        {tab === 'Sent back' && rows.length > 0 && <div className="card-body" style={{ paddingBottom: 0 }}><AlertBanner tone="info" title="Waiting for a fix">The caregiver corrects it in the app and sends it again. It comes back to “To review” when it’s fixed.</AlertBanner></div>}
        {rows.length === 0 ? <EmptyState icon={CheckCircle2} title={tab === 'To review' ? 'All finished visits are checked' : 'Nothing here'} text={tab === 'To review' ? 'New visits appear here when the caregiver checks out.' : tab === 'Sent back' ? 'No visits are waiting for a fix.' : 'Approved visits appear here.'} /> : <>
          <div className="table-wrap"><table className="tbl">
            <thead><tr>{tab === 'To review' && <th style={{ width: 36 }} />}<th>Visit</th><th>Caregiver</th><th>Planned</th><th>Recorded</th><th>{tab === 'Approved' ? 'Approved' : tab === 'Sent back' ? 'Why it was sent back' : 'To look at'}</th><th style={{ width: 30 }} /></tr></thead>
            <tbody>{pg.slice.map(({ v, flags }) => { const a = actualMins(v); return (
              <tr key={v.id} className="clickable" onClick={() => nav(`/visits/${v.id}?from=${encodeURIComponent(`/approvals?tab=${tab}`)}`)}>
                {tab === 'To review' && <td onClick={e => e.stopPropagation()}>{flags.length ? <span title="Open it to check first"><Ban size={14} color="var(--text-muted)" /></span> : <input type="checkbox" aria-label={`Select visit ${v.id.slice(1)}`} style={{ width: 18, height: 18, accentColor: 'var(--action-primary)' }} checked={picked.includes(v.id)} onChange={e => setPicked(p => e.target.checked ? [...p, v.id] : p.filter(x => x !== v.id))} />}</td>}
                <td><div className="t-medium">{s.client(v.clientId)?.name}</div><div className="t-caption t-muted">{v.date === TODAY ? 'Today' : fmtDate(v.date)} · {v.service} · #{v.id.slice(1)}</div></td>
                <td>{s.caregiver(v.caregiverId)?.name ?? '—'}</td>
                <td>{v.start}–{v.end}<div className="t-caption t-muted">{hrs(plannedMins(v))}</div></td>
                <td>{v.checkIn ?? '—'}–{v.checkOut ?? <span style={{ color: 'var(--status-danger)' }}>no check-out</span>}<div className="t-caption t-muted">{a !== null ? hrs(a) : '—'}{v.original && ' · corrected'}</div></td>
                <td>{tab === 'Approved' ? <><Chip tone="success">Approved</Chip><div className="t-caption t-muted">{v.approvedBy} · {v.approvedAt}{v.billing ? ' · invoiced' : ''}</div></>
                  : tab === 'Sent back' ? <div className="t-small" style={{ maxWidth: 320 }}>{v.returned?.reason}<div className="t-caption t-muted">{v.returned?.by} · {v.returned?.at}</div></div>
                  : flags.length ? <div className="col" style={{ gap: 4 }}>{flags.map(f => <span key={f.key} className="row t-caption" style={{ gap: 4, color: f.tone === 'danger' ? 'var(--status-danger)' : 'var(--status-warning)' }}><TriangleAlert size={12} />{f.title}</span>)}</div>
                  : <span className="row t-caption" style={{ gap: 4, color: 'var(--status-success)' }}><CheckCircle2 size={12} />Matches the plan</span>}</td>
                <td><ChevronRight size={16} color="var(--text-muted)" /></td>
              </tr>) })}</tbody>
          </table></div>
          <Pager {...pg} onPage={pg.setPage} />
        </>}
      </div>
      {tab === 'To review' && rows.length > 0 && <div className="row t-caption t-muted" style={{ gap: 6 }}><ClipboardCheck size={13} />Visits with something to look at must be opened and approved one by one.</div>}
      {confirm && <ConfirmDialog title={`Approve ${picked.length} visit${picked.length > 1 ? 's' : ''}?`} text="They match what was planned. Once approved they go to Finance for billing and timesheets. You can still correct them later — every change is recorded." confirm="Approve visits" onClose={() => setConfirm(false)} onConfirm={approveMany} />}
    </>
  )
}
