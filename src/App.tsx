import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import DashboardLayout from './components/layout/DashboardLayout';
import StreamerDashboard from './pages/dashboard/StreamerDashboard';
import StreamerProfile from './pages/dashboard/StreamerProfile';
import CallPage from "./pages/call/CallPage";
import ActiveCallPage from "./pages/call/ActiveCallPage";
import KYCPage from './pages/dashboard/KYCPage';
import EarningsPage from './pages/dashboard/EarningsPage';
import ViewerDashboard from './pages/dashboard/ViewerDashboard';
import ViewerWallet from './pages/dashboard/ViewerWallet';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLiveOps from './pages/admin/AdminLiveOps';
import AdminCommission from './pages/admin/AdminCommission';
import AdminUsers from './pages/admin/AdminUsers';
import LandingPage from './pages/public/LandingPage';
import TermsPage from './pages/public/TermsPage';
import ContactPage from './pages/public/ContactPage';
import PublicProfile from './pages/public/PublicProfile'; // New
import AgeGate from './components/ui/AgeGate';

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { token, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen bg-dark-900 flex items-center justify-center text-primary-500">Carregando...</div>;
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AgeGate />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/p/:id" element={<PublicProfile />} /> {/* Public Profile Route */}
          
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/live-ops" element={<PrivateRoute><AdminLiveOps /></PrivateRoute>} />
          <Route path="/admin/commission" element={<PrivateRoute><AdminCommission /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute><AdminUsers /></PrivateRoute>} />
          
          <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route path="streamer" element={<StreamerDashboard />} />
            <Route path="streamer/profile" element={<StreamerProfile />} />
            <Route path="streamer/kyc" element={<KYCPage />} />
            <Route path="streamer/earnings" element={<EarningsPage />} />
            <Route path="viewer" element={<ViewerDashboard />} />
            <Route path="viewer/wallet" element={<ViewerWallet />} />
            <Route path="call/:id" element={<CallPage />} />
<Route path="call/active" element={<ActiveCallPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
