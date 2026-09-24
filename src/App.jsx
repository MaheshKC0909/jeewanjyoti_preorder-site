import { Routes, Route } from 'react-router-dom'
import DigitalCareLanding from './DigitalCareLanding'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import InstitutionDashboard from './pages/InstitutionDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import PaymentSuccess from './pages/PaymentSuccess'
import MappingSuccess from './lib/MappingSuccess'
import Blogs from './pages/Blogs'
import Leaderboard from './pages/Leaderboard'
import GetStarted from './pages/GetStarted'

function App() {
  return (
    <Routes>
      <Route path="/" element={<DigitalCareLanding />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<Login adminMode />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/institution-dashboard" element={<InstitutionDashboard />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/mapping-success" element={<MappingSuccess />} />
      <Route path="/blogs" element={<Blogs />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/get-started" element={<GetStarted />} />
    </Routes>
  )
}

export default App
