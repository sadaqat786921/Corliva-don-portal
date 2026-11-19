import { createContext, useCallback, useContext, useEffect, useState, ReactNode, Dispatch, SetStateAction } from 'react'
import * as seed from './seed'
import type { AuditEntry, Note } from './seed'

export type Tone = 'success' | 'danger' | 'info' | 'warning'
interface Toast { id: number; text: string; tone: Tone }

const ss = {
  get(k: string) { try { return sessionStorage.getItem(k) } catch { return null } },
  set(k: string, v: string) { try { sessionStorage.setItem(k, v) } catch { /* ignore */ } },
  del(k: string) { try { sessionStorage.removeItem(k) } catch { /* ignore */ } },
}
const DATA_PREFIX = 'corliva.don.data.'

/** useState that is saved in sessionStorage, so demo changes survive a page refresh. */
function usePersist<T>(key: string, init: T): [T, Dispatch<SetStateAction<T>>] {
  const [v, setV] = useState<T>(() => {
    const raw = ss.get(DATA_PREFIX + key)
    if (raw) { try { return JSON.parse(raw) as T } catch { /* ignore */ } }
    return init
  })
  useEffect(() => { ss.set(DATA_PREFIX + key, JSON.stringify(v)) }, [key, v])
  return [v, setV]
}

/** Clears every saved demo change and reloads the original sample data. Keeps the user signed in. */
export function resetDemoData() {
  try { Object.keys(sessionStorage).filter(k => k.startsWith(DATA_PREFIX)).forEach(k => sessionStorage.removeItem(k)) } catch { /* ignore */ }
  window.location.reload()
}

export const stampNow = () => { const d = new Date(); return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

function useStoreValue() {
  const [signedIn, setSignedIn] = useState(ss.get('corliva.don.auth') === '1')
  const [me, setMe] = usePersist('me', seed.ME)
  const agency = { name: 'Royality Home Care', timezone: 'Central Time' }
  const [users] = usePersist('users', seed.users)
  const [lists] = usePersist('lists', seed.lists)
  const [clients, setClients] = usePersist('clients', seed.clients)
  const [carePlans, setCarePlans] = usePersist('carePlans', seed.carePlans)
  const [documents, setDocuments] = usePersist('documents', seed.documents)
  const [caregivers] = usePersist('caregivers', seed.caregivers)
  const [visits, setVisits] = usePersist('visits', seed.visits)
  const [incidents, setIncidents] = usePersist('incidents', seed.incidents)
  const [audit, setAudit] = usePersist('audit', seed.audit)
  const [inbox, setInbox] = usePersist('inbox', seed.inbox)
  const [checks, setChecks] = usePersist('checks', seed.checks)
  const [reviews, setReviews] = usePersist('reviews', seed.reviews)
  const [trainings, setTrainings] = usePersist('trainings', seed.trainings)
  const [branch, setBranch] = usePersist<string>('branch', 'all')
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((text: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, text, tone }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3600)
  }, [])

  /** Keep a record of a change (shown in each record's history). */
  const log = useCallback((e: Omit<AuditEntry, 'id' | 'at' | 'actor'>) => {
    setAudit(a => [{ id: 'au' + Date.now() + Math.random(), at: stampNow(), actor: seed.ME.name, ...e }, ...a])
  }, [setAudit])

  /** Add a line to a client's history. */
  const clientNote = useCallback((clientId: string, text: string) => {
    const n: Note = { by: seed.ME.name, at: stampNow(), text }
    setClients(cs => cs.map(c => c.id === clientId ? { ...c, history: [...c.history, n] } : c))
  }, [setClients])

  const branchName = (id: string) => id === 'all' ? 'All branches' : (seed.branches.find(b => b.id === id)?.name ?? id)
  /** The Care Supervisor covers every branch; the branch filter (sidebar and header) narrows every page. */
  const inBranch = (b: string) => branch === 'all' || b === 'all' || b === branch
  const client = (id: string) => clients.find(c => c.id === id)
  const caregiver = (id: string | null | undefined) => caregivers.find(g => g.id === id)

  const signIn = () => { setSignedIn(true); ss.set('corliva.don.auth', '1') }
  const signOut = () => { setSignedIn(false); ss.del('corliva.don.auth') }

  return {
    signedIn, signIn, signOut, me, setMe, agency, users, lists, branch, setBranch, branchName, inBranch, client, caregiver,
    clients, setClients, carePlans, setCarePlans, documents, setDocuments, caregivers,
    visits, setVisits, incidents, setIncidents, audit, log, clientNote, inbox, setInbox, checks, setChecks, reviews, setReviews, trainings, setTrainings, toasts, toast, rules: seed.rules,
  }
}

export type Store = ReturnType<typeof useStoreValue>
const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue()
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore must be used inside StoreProvider')
  return v
}

export const fmtDate = (isoDate: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) => {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', opts)
}
/** Shows a stored note time: ISO dates become "12 Nov", stamps are shown as they are. */
export const showAt = (at: string) => /^\d{4}-\d\d-\d\d$/.test(at) ? fmtDate(at, { day: 'numeric', month: 'short' }) : at
export const hoursBetween = (a: string, b: string) => { const [h1, m1] = a.split(':').map(Number); const [h2, m2] = b.split(':').map(Number); return ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60 }
