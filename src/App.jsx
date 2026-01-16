import { Routes, Route } from 'react-router-dom'
import JeewanJyotiLanding from './JeewanJyotiLanding'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import PaymentSuccess from './pages/PaymentSuccess'
import MappingSuccess from './lib/MappingSuccess'
import Blogs from './pages/Blogs'

function App() {
  return (
    <Routes>
      <Route path="/" element={<JeewanJyotiLanding />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/mapping-success" element={<MappingSuccess />} />
      <Route path="/blogs" element={<Blogs />} />
    </Routes>
  )
}

export default App
