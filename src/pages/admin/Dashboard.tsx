import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, FileText, LogOut } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-green-500" />
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/admin/fraud')}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-red-500/50 transition text-left"
          >
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Anti-Fraude</h2>
            <p className="text-gray-400 text-sm">Sistema de detecção e prevenção</p>
          </button>

          <button
            onClick={() => navigate('/admin/moderation')}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-yellow-500/50 transition text-left"
          >
            <Shield className="w-12 h-12 text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Moderação</h2>
            <p className="text-gray-400 text-sm">Denúncias e banimentos</p>
          </button>

          <button
            onClick={() => navigate('/admin/reconciliation')}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-blue-500/50 transition text-left"
          >
            <FileText className="w-12 h-12 text-blue-500 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Reconciliação</h2>
            <p className="text-gray-400 text-sm">Relatórios financeiros</p>
          </button>
        </div>
      </div>
    </div>
  );
}
