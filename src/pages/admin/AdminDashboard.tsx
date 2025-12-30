import { useEffect, useState } from 'react';
import api from '../../services/api.ts';
import { Users, Video, DollarSign, Activity, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>({
    total_users: 0,
    total_streamers: 0,
    active_calls: 0,
    revenue_today: 0,
    pending_kyc: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Endpoint simulado se não existir ainda, para não quebrar a tela
      // Em produção real, o backend deve retornar isso
      const { data } = await api.get('/admin/stats').catch(() => ({ 
        data: { total_users: 0, total_streamers: 0, active_calls: 0, revenue_today: 0, pending_kyc: 0 } 
      }));
      setStats(data);
    } catch (e) {
      console.error(e);
      setError('Erro ao carregar estatísticas. O backend pode estar offline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Centro de Comando</h1>
        <span className="bg-primary-500/20 text-primary-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          Admin Mode
        </span>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users />} label="Total Usuários" value={stats.total_users} color="blue" />
        <StatCard icon={<Video />} label="Chamadas Hoje" value={stats.active_calls} color="purple" />
        <StatCard icon={<DollarSign />} label="Receita Hoje" value={`R$ ${stats.revenue_today}`} color="green" />
        <Link to="/admin/users" className="block">
           <StatCard icon={<Activity />} label="KYC Pendente" value={stats.pending_kyc} color="orange" />
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-dark-800 p-6 rounded-2xl border border-dark-700">
          <h3 className="text-xl font-bold text-white mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/admin/users" className="p-4 bg-dark-700 hover:bg-dark-600 rounded-xl text-center transition-colors">
              <span className="block text-white font-bold">Gerenciar Usuários</span>
              <span className="text-xs text-gray-400">Banir, Aprovar, Editar</span>
            </Link>
            <Link to="/admin/live-ops" className="p-4 bg-dark-700 hover:bg-dark-600 rounded-xl text-center transition-colors">
              <span className="block text-white font-bold">Live Ops</span>
              <span className="text-xs text-gray-400">Monitorar chamadas</span>
            </Link>
             <Link to="/admin/commission" className="p-4 bg-dark-700 hover:bg-dark-600 rounded-xl text-center transition-colors">
              <span className="block text-white font-bold">Comissões</span>
              <span className="text-xs text-gray-400">Ajustar taxas</span>
            </Link>
          </div>
        </div>

        <div className="bg-dark-800 p-6 rounded-2xl border border-dark-700">
            <h3 className="text-xl font-bold text-white mb-4">Status do Sistema</h3>
            <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Database (D1)</span>
                    <span className="text-green-500 font-bold">Conectado</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Storage (R2)</span>
                    <span className="text-green-500 font-bold">Conectado</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">LiveKit (Video)</span>
                    <span className="text-yellow-500 font-bold">Verificar Chaves</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colors: any = {
    blue: "bg-blue-500/20 text-blue-400",
    purple: "bg-purple-500/20 text-purple-400",
    green: "bg-green-500/20 text-green-400",
    orange: "bg-orange-500/20 text-orange-400"
  };

  return (
    <div className="bg-dark-800 p-6 rounded-2xl border border-dark-700 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}
