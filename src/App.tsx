import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/pages/Login'
import ProtectedLayout from './components/layouts/ProtectedLayout'
import MedOncPatientLayout from './components/layouts/MedOncPatientLayout'
import PatientOverview from './components/pages/PatientOverview'
import PatientEV from './components/pages/PatientEV'
import PAOrders from './components/pages/PAOrders'
import MedOncDynamicsLayout from './components/layouts/MedOncDynamicsLayout'
import Documents from './components/pages/dynamics/Documents'
import AuthLetters from './components/pages/dynamics/AuthLetters'
import Issues from './components/pages/dynamics/Issues'
import Workflow from './components/pages/dynamics/Workflow'
import Authorization from './components/pages/dynamics/Authorization'
import FiledPA from './components/pages/dynamics/FiledPA'
import BusinessOffice from './components/pages/dynamics/BusinessOffice'
import PAFormWithGuidelines from './components/pages/PAFormWithGuidelines'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes with Navbar */}
        <Route element={<ProtectedLayout />}>
          {/* PA Orders Home Screen */}
          <Route path="/" element={<PAOrders />} />

          {/* Patient EV Screen */}
          <Route path="/patient/:id/ev" element={<PatientEV />} />

          {/* PA Form with Guidelines */}
          <Route path="/patient/:id/pa-form-guidelines" element={<PAFormWithGuidelines />} />

          {/* Patient Detail Routes with Tabs */}
          <Route path="/patient/:id" element={<MedOncPatientLayout />}>
            <Route path="overview" element={<PatientOverview />} />
            <Route path="dynamics" element={<MedOncDynamicsLayout />}>
              <Route index element={<Navigate to="authorization" replace />} />
              <Route path="authorization" element={<Authorization />} />
              <Route path="issues" element={<Issues />} />
              <Route path="documents" element={<Documents />} />
              <Route path="workflow" element={<Workflow />} />
              <Route path="auth-letters" element={<AuthLetters />} />
              <Route path="filed-pa" element={<FiledPA />} />
              <Route path="business-office" element={<BusinessOffice />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
