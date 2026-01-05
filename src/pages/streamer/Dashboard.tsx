import { useNavigate } from 'react-router-dom';
import { Video, Calendar, BarChart3, LogOut } from 'lucide-react';

export default function StreamerDashboard() {
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
            <Video className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-white">Dashboard Streamer</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/streamer/schedule')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
            >
              <Calendar className="w-5 h-5" />
              <span>Agenda</span>
            </button>
            <button
              onClick={() => navigate('/streamer/analytics')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Analytics</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">🎥 Área do Streamer</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-blue-500/20 p-6 rounded-xl border border-blue-500/30">
              <div className="text-4xl font-bold text-white mb-2">0</div>
              <div className="text-gray-300">Chamadas Hoje</div>
            </div>
            <div className="bg-green-500/20 p-6 rounded-xl border border-green-500/30">
              <div className="text-4xl font-bold text-white mb-2">R$ 0</div>
              <div className="text-gray-300">Ganhos do Mês</div>
            </div>
            <div className="bg-purple-500/20 p-6 rounded-xl border border-purple-500/30">
              <div className="text-4xl font-bold text-white mb-2">0</div>
              <div className="text-gray-300">Seguidores</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
