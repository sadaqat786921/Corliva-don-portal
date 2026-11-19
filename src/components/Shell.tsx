import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutGrid, Home, UserCheck, HeartPulse, BarChart3, GraduationCap, CalendarDays, Clock, Users, TriangleAlert, SlidersHorizontal, LogOut, ClipboardCheck, FileText, ShieldCheck,
  Search, ChevronDown, Calendar, Bell, Building2, RotateCcw, UserRound, Check,
} from 'lucide-react'
import { useStore, fmtDate, resetDemoData } from '../data/store'
import { TODAY, branches } from '../data/seed'
import { liveState } from '../data/schedule'
import { toReview } from '../data/review'
import { attendanceMissing, checkInDue, reviewState, staffPeople } from '../data/nursing'
import { ConfirmDialog, Toasts, useClickOutside } from './ui'

const NAV = [
  { section: 'Overview', items: [
    { to: '/', label: 'My work', icon: LayoutGrid, end: true },
    { to: '/supervisors', label: 'Care Supervisors', icon: UserCheck },
  ] },
  { section: 'Care quality', items: [
    { to: '/health', label: 'Clients’ health', icon: HeartPulse, badge: 'health' },
    { to: '/quality', label: 'Quality and risk', icon: BarChart3 },
    { to: '/incidents', label: 'Incidents', icon: TriangleAlert, badge: 'incidents' },
  ] },
  { section: 'Reviews', items: [
    { to: '/approvals', label: 'Visit approvals', icon: ClipboardCheck, badge: 'visits' },
    { to: '/care-plans', label: 'Care plans', icon: FileText, badge: 'plans' },
    { to: '/checks', label: 'Checks', icon: ShieldCheck, badge: 'checks' },
  ] },
  { section: 'Clients and visits', items: [
    { to: '/clients', label: 'Clients', icon: Home },
    { to: '/schedule', label: 'Schedule', icon: CalendarDays },
    { to: '/today', label: 'Today’s visits', icon: Clock, badge: 'late' },
  ] },
  { section: 'Staff', items: [
    { to: '/caregivers', label: 'Caregivers', icon: Users },
    { to: '/staff', label: 'Reviews and training', icon: GraduationCap, badge: 'staff' },
  ] },
  { section: 'Account', items: [{ to: '/settings', label: 'Settings', icon: SlidersHorizontal }] },
]
const BRANCH_OPTIONS = [{ id: 'all', name: 'All branches' }, ...branches]

export default function Shell() {
  const s = useStore()
  const nav = useNavigate()
  const [confirmOut, setConfirmOut] = useState(false)
  const [branchOpen, setBranchOpen] = useState(false)
  const branchRef = useClickOutside<HTMLDivElement>(branchOpen, () => setBranchOpen(false))
  const staff = staffPeople(s.caregivers, s.users)
  const badges: Record<string, number> = {
    visits: s.visits.filter(v => s.inBranch(v.branch) && toReview(v)).length,
    plans: s.carePlans.filter(p => p.status === 'Awaiting review' && s.inBranch(s.client(p.clientId)?.branch ?? '')).length,
    checks: s.documents.filter(d => d.status === 'Not checked' && s.inBranch(s.client(d.clientId)?.branch ?? '')).length + s.checks.filter(k => k.status === 'Waiting for check' && s.inBranch(s.caregiver(k.caregiverId)?.branch ?? '')).length,
    late: s.visits.filter(v => s.inBranch(v.branch) && v.date === TODAY && liveState(v) === 'Late').length,
    incidents: s.incidents.filter(i => s.inBranch(i.branch) && (i.status === 'Reported' || (i.severity === 'High' && !['Resolved', 'Closed'].includes(i.status)))).length,
    health: s.clients.filter(c => s.inBranch(c.branch) && checkInDue(c)).length,
    staff: s.reviews.filter(r => reviewState(r) === 'Overdue' && staff.some(p => p.id === r.personId && s.inBranch(p.branch))).length + s.trainings.filter(attendanceMissing).length,
  }
  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Main menu">
        <div className="sidebar-logo"><img src="./images/corliva-logo-white.svg" alt="CORLIVA" /></div>
        <div ref={branchRef} style={{ position: 'relative' }}>
          <button className="agency-switch" onClick={() => setBranchOpen(o => !o)} aria-expanded={branchOpen} aria-label="Choose branch">
            <span className="agency-avatar">RH</span>
            <span className="grow">
              <span style={{ display: 'block', fontWeight: 500, fontSize: 13 }}>{s.agency.name}</span>
              <span style={{ display: 'block', fontSize: 11, opacity: .85 }}>{s.branchName(s.branch)}</span>
            </span>
            <ChevronDown size={16} />
          </button>
          {branchOpen && (
            <div className="popover" style={{ left: 0, right: 0 }}>
              <div className="t-caption t-muted" style={{ padding: '6px 10px' }}>Show work for</div>
              {BRANCH_OPTIONS.map(b => (
                <button key={b.id} className="menu-item" onClick={() => { s.setBranch(b.id); setBranchOpen(false) }}>
                  <Building2 />{b.name}{s.branch === b.id && <Check style={{ marginLeft: 'auto', color: 'var(--action-primary)' }} />}
                </button>))}
            </div>)}
        </div>
        <nav>
          {NAV.map(g => (
            <div key={g.section}>
              <div className="nav-section">{g.section}</div>
              {g.items.map(it => (
                <NavLink key={it.to} to={it.to} end={'end' in it ? it.end : false} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <it.icon />{it.label}
                  {'badge' in it && it.badge && badges[it.badge] > 0 && <span className="nav-badge">{badges[it.badge]}</span>}
                </NavLink>
              ))}
            </div>
          ))}
          <button className="nav-item" onClick={() => setConfirmOut(true)}><LogOut />Log Out</button>
        </nav>
      </aside>
      <main className="main">
        <Header />
        <Outlet />
      </main>
      <Toasts />
      {confirmOut && <ConfirmDialog title="Log out of CORLIVA?" text="You will need your email, password and security code to sign back in." confirm="Log out" onClose={() => setConfirmOut(false)} onConfirm={() => { s.signOut(); nav('/login') }} />}
    </div>
  )
}

function Header() {
  const s = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const [open, setOpen] = useState<null | 'bell' | 'branch' | 'me' | 'search'>(null)
  const close = useCallback(() => setOpen(null), [])
  const ref = useClickOutside<HTMLDivElement>(open !== null, close)
  const [q, setQ] = useState('')
  const [resetting, setResetting] = useState(false)
  useEffect(() => { setOpen(null); setQ('') }, [loc.pathname, loc.search])

  const results = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (t.length < 2) return []
    const r: { label: string; sub: string; to: string }[] = []
    s.clients.filter(c => s.inBranch(c.branch) && c.name.toLowerCase().includes(t)).forEach(c => r.push({ label: c.name, sub: `Client · ${c.status}`, to: `/clients/${c.id}` }))
    s.incidents.filter(x => s.inBranch(x.branch) && (x.title.toLowerCase().includes(t) || x.id.toLowerCase().includes(t))).forEach(x => r.push({ label: x.title, sub: `Incident ${x.id} · ${x.status}`, to: `/incidents/${x.id}` }))
    s.caregivers.filter(g => s.inBranch(g.branch) && g.name.toLowerCase().includes(t)).forEach(g => r.push({ label: g.name, sub: `Caregiver · ${g.readiness === 'Blocked' ? 'Not ready' : g.readiness}`, to: `/caregivers/${g.id}` }))
    s.visits.filter(v => s.inBranch(v.branch) && ('#' + v.id.slice(1)).includes(t)).forEach(v => r.push({ label: 'Visit #' + v.id.slice(1), sub: `${fmtDate(v.date)} · ${v.start} · ${s.client(v.clientId)?.name}`, to: `/visits/${v.id}` }))
    return r.slice(0, 8)
  }, [q, s.clients, s.incidents, s.caregivers, s.visits, s.branch])

  const unread = s.inbox.filter(n => !n.read).length
  const go = (to: string) => { setOpen(null); setQ(''); nav(to) }

  return (
    <header className="header" ref={ref}>
      <div style={{ position: 'relative' }}>
        <div className="search" style={{ width: 300 }}>
          <Search />
          <input aria-label="Search" placeholder="Search clients, caregivers, visits, incidents" value={q} onChange={e => { setQ(e.target.value); setOpen('search') }} onFocus={() => setOpen('search')} onKeyDown={e => { if (e.key === 'Enter' && results[0]) go(results[0].to) }} />
        </div>
        {open === 'search' && q.trim().length >= 2 && (
          <div className="popover" style={{ left: 0, right: 'auto', width: 360 }}>
            {results.length === 0 ? <div className="t-small t-muted" style={{ padding: 12 }}>Nothing found for “{q}” in {s.branchName(s.branch)}.</div>
              : results.map(r => <button key={r.to + r.label} className="menu-item" onClick={() => go(r.to)}><Search /><span><span style={{ display: 'block', fontWeight: 500 }}>{r.label}</span><span className="t-caption t-muted">{r.sub}</span></span></button>)}
          </div>)}
      </div>
      <div className="header-spacer" />
      <div style={{ position: 'relative' }}>
        <button className="header-chip" onClick={() => setOpen(open === 'branch' ? null : 'branch')} aria-expanded={open === 'branch'}>
          <Building2 size={16} />{s.branchName(s.branch)}<ChevronDown size={14} />
        </button>
        {open === 'branch' && (
          <div className="popover">
            {BRANCH_OPTIONS.map(b => (
              <button key={b.id} className="menu-item" onClick={() => { s.setBranch(b.id); setOpen(null) }}>
                <Building2 />{b.name}{s.branch === b.id && <Check style={{ marginLeft: 'auto', color: 'var(--action-primary)' }} />}
              </button>))}
          </div>)}
      </div>
      <div className="header-chip" title={`Agency time zone: ${s.agency.timezone}`}><Calendar size={16} />{fmtDate(TODAY, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>

      <div style={{ position: 'relative' }}>
        <button className="icon-btn" aria-label={`Alerts, ${unread} unread`} onClick={() => setOpen(open === 'bell' ? null : 'bell')}><Bell size={18} />{unread > 0 && <span className="dot" />}</button>
        {open === 'bell' && (
          <div className="popover" style={{ width: 380 }}>
            <div className="row between" style={{ padding: '6px 10px 8px' }}><span className="t-strong">Alerts</span><button className="link-btn" disabled={!unread} onClick={() => s.setInbox(i => i.map(n => ({ ...n, read: true })))}>Mark all as read</button></div>
            {s.inbox.map(n => (
              <button key={n.id} className="menu-item" style={{ alignItems: 'flex-start' }} onClick={() => { s.setInbox(i => i.map(x => x.id === n.id ? { ...x, read: true } : x)); go(n.link) }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0, background: n.read ? 'transparent' : `var(--status-${n.tone})` }} />
                <span><span style={{ display: 'block', fontWeight: n.read ? 400 : 600 }}>{n.title}</span><span className="t-caption t-muted">{n.body} · {n.at}</span></span>
              </button>))}
            <div className="t-caption t-muted" style={{ padding: '8px 10px 4px' }}>Reading an alert doesn’t fix the problem — it stays on your list until it’s sorted.</div>
          </div>)}
      </div>

      <div style={{ position: 'relative' }}>
        <button className="profile-btn" onClick={() => setOpen(open === 'me' ? null : 'me')} aria-expanded={open === 'me'}>
          <span className="avatar">{s.me.initials}</span>
          <span><span style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{s.me.name}</span><span className="t-caption t-muted">Director of Nursing</span></span>
          <ChevronDown size={14} />
        </button>
        {open === 'me' && (
          <div className="popover">
            <button className="menu-item" onClick={() => go('/settings')}><UserRound />My profile</button>
            <button className="menu-item" onClick={() => go('/settings?tab=security')}><ShieldCheck />Password & security</button>
            <button className="menu-item" onClick={() => { setOpen(null); setResetting(true) }}><RotateCcw />Reset demo data</button>
            <div className="menu-sep" />
            <button className="menu-item danger" onClick={() => { s.signOut(); go('/login') }}><LogOut />Log out</button>
          </div>)}
      </div>
      {resetting && <ConfirmDialog title="Reset demo data?" text="All changes you made in this preview will be removed and the original sample data comes back. You stay signed in." confirm="Reset demo data" danger onClose={() => setResetting(false)} onConfirm={resetDemoData} />}
    </header>
  )
}
