import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ViewerBrowse from './pages/viewer/Browse';
import ViewerProfile from './pages/viewer/Profile';
import ViewerWallet from './pages/viewer/Wallet';
import StreamerDashboard from './pages/streamer/Dashboard';
import StreamerSchedule from './pages/streamer/Schedule';
import StreamerAnalytics from './pages/streamer/Analytics';
import AdminDashboard from './pages/admin/Dashboard';
import FraudDashboard from './pages/admin/FraudDashboard';
import ModerationDashboard from './pages/admin/ModerationDashboard';
import ReconciliationDashboard from './pages/admin/ReconciliationDashboard';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Viewer Routes */}
        <Route path="/viewer/browse" element={<ViewerBrowse />} />
        <Route path="/viewer/profile" element={<ViewerProfile />} />
        <Route path="/viewer/wallet" element={<ViewerWallet />} />

        {/* Streamer Routes */}
        <Route path="/streamer/dashboard" element={<StreamerDashboard />} />
        <Route path="/streamer/schedule" element={<StreamerSchedule />} />
        <Route path="/streamer/analytics" element={<StreamerAnalytics />} />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/fraud" element={<FraudDashboard />} />
        <Route path="/admin/moderation" element={<ModerationDashboard />} />
        <Route path="/admin/reconciliation" element={<ReconciliationDashboard />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App;
