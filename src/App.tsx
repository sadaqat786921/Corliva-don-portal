import type { ReactElement } from 'react'
import { HashRouter, Navigate, Route, Routes, Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { StoreProvider, useStore } from './data/store'
import Shell from './components/Shell'
import { EmptyState } from './components/ui'
import { Login, Forgot } from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Approvals from './pages/Approvals'
import CarePlans from './pages/CarePlans'
import CarePlanDetail from './pages/CarePlanDetail'
import Checks from './pages/Checks'
import Health from './pages/Health'
import Quality from './pages/Quality'
import Supervisors from './pages/Supervisors'
import Staff, { TrainingDetail } from './pages/Staff'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import VisitDetail from './pages/VisitDetail'
import CaregiverDetail from './pages/CaregiverDetail'
import IncidentDetail from './pages/IncidentDetail'
import Schedule from './pages/Schedule'
import Today from './pages/Today'
import Caregivers from './pages/Caregivers'
import Incidents from './pages/Incidents'
import Settings from './pages/Settings'

function Guard({ children }: { children: ReactElement }) {
  const s = useStore()
  if (!s.signedIn) return <Navigate to="/login" replace />
  return children
}

function NotFound() {
  return <div className="card"><EmptyState icon={Compass} tone="info" title="We can’t find that page" text="The link may be old, or you may not have access to it." action={<Link className="btn btn-primary" to="/">Go to My work</Link>} /></div>
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route element={<Guard><Shell /></Guard>}>
            <Route index element={<Dashboard />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="care-plans" element={<CarePlans />} />
            <Route path="care-plans/:id" element={<CarePlanDetail />} />
            <Route path="checks" element={<Checks />} />
            <Route path="health" element={<Health />} />
            <Route path="quality" element={<Quality />} />
            <Route path="supervisors" element={<Supervisors />} />
            <Route path="staff" element={<Staff />} />
            <Route path="training/:id" element={<TrainingDetail />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="visits/:id" element={<VisitDetail />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="today" element={<Today />} />
            <Route path="caregivers" element={<Caregivers />} />
            <Route path="caregivers/:id" element={<CaregiverDetail />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="incidents/:id" element={<IncidentDetail />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </StoreProvider>
  )
}
