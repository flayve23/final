import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Users, Video, AlertTriangle, Download, Calendar } from 'lucide-react';
import api from '../../services/api';

interface KPIs {
  revenue: {
    total: number;
    streamer_earnings: number;
    platform_fee: number;
    platform_fee_percentage: number;
  };
  calls: {
    total: number;
    avg_duration_minutes: number;
    avg_value: number;
  };
  users: {
    viewers: number;
    streamers: number;
  };
  chargebacks: {
    total: number;
    amount: number;
  };
  conversion_rate: number;
}

export default function FinancialReports() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [topStreamers, setTopStreamers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [kpisRes, revenueRes, streamersRes] = await Promise.all([
        api.get('/reports/kpis'),
        api.get('/reports/revenue', { params: { period } }),
        api.get('/reports/top-streamers', { params: { limit: 10 } })
      ]);

      setKpis(kpisRes.data);
      setRevenueData(revenueRes.data.revenue || []);
      setTopStreamers(streamersRes.data.top_streamers || []);
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/reports/export/csv', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `flayve_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      alert('Erro ao exportar relatório');
    }
  };

  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  if (loading || !kpis) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Carregando relatórios...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="text-primary-500" />
          Relatórios Financeiros
        </h1>
        <div className="flex items-center gap-3">
          {/* Filtro de Período */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-dark-700 border border-dark-600 rounded-lg text-white px-4 py-2 outline-none"
          >
            <option value="day">Últimas 24h</option>
            <option value="week">Última Semana</option>
            <option value="month">Último Mês</option>
            <option value="year">Último Ano</option>
          </select>

          {/* Exportar CSV */}
          <button
            onClick={handleExportCSV}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        {/* Receita Total */}
        <div className="bg-gradient-to-br from-green-900/50 to-dark-900 p-6 rounded-2xl border border-green-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-green-200">Receita Total</p>
              <p className="text-2xl font-bold text-white">R$ {kpis.revenue.total.toFixed(2)}</p>
            </div>
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <p>Streamers: R$ {kpis.revenue.streamer_earnings.toFixed(2)} (80%)</p>
            <p>Plataforma: R$ {kpis.revenue.platform_fee.toFixed(2)} (20%)</p>
          </div>
        </div>

        {/* Total de Chamadas */}
        <div className="bg-gradient-to-br from-blue-900/50 to-dark-900 p-6 rounded-2xl border border-blue-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Video className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-blue-200">Chamadas</p>
              <p className="text-2xl font-bold text-white">{kpis.calls.total}</p>
            </div>
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <p>Duração média: {kpis.calls.avg_duration_minutes} min</p>
            <p>Valor médio: R$ {kpis.calls.avg_value.toFixed(2)}</p>
          </div>
        </div>

        {/* Usuários Ativos */}
        <div className="bg-gradient-to-br from-purple-900/50 to-dark-900 p-6 rounded-2xl border border-purple-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-purple-200">Usuários Ativos</p>
              <p className="text-2xl font-bold text-white">{kpis.users.viewers + kpis.users.streamers}</p>
            </div>
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <p>Viewers: {kpis.users.viewers}</p>
            <p>Streamers: {kpis.users.streamers}</p>
            <p>Conversão: {kpis.conversion_rate}%</p>
          </div>
        </div>

        {/* Chargebacks */}
        <div className="bg-gradient-to-br from-red-900/50 to-dark-900 p-6 rounded-2xl border border-red-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-red-200">Chargebacks</p>
              <p className="text-2xl font-bold text-white">{kpis.chargebacks.total}</p>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            <p>Valor: R$ {kpis.chargebacks.amount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Gráfico de Receita */}
      <div className="bg-dark-800 p-6 rounded-2xl border border-dark-700">
        <h3 className="text-lg font-bold text-white mb-4">Receita ao Longo do Tempo</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Receita (R$)" />
            <Line type="monotone" dataKey="unique_users" stroke="#8b5cf6" strokeWidth={2} name="Usuários Únicos" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Streamers */}
      <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
        <div className="p-6 border-b border-dark-700">
          <h3 className="text-lg font-bold text-white">🏆 Top 10 Streamers (Últimos 30 dias)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-900">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase">#</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase">Streamer</th>
                <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase">Ganhos</th>
                <th className="text-center px-6 py-3 text-xs font-bold text-gray-400 uppercase">Chamadas</th>
                <th className="text-center px-6 py-3 text-xs font-bold text-gray-400 uppercase">Duração Média</th>
                <th className="text-center px-6 py-3 text-xs font-bold text-gray-400 uppercase">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {topStreamers.map((streamer, index) => (
                <tr key={streamer.id} className="hover:bg-dark-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`text-2xl font-bold ${
                      index === 0 ? 'text-yellow-500' :
                      index === 1 ? 'text-gray-400' :
                      index === 2 ? 'text-orange-600' :
                      'text-gray-600'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={streamer.photo_url || '/default-avatar.png'}
                        alt={streamer.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <span className="font-bold text-white">{streamer.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-bold text-green-500">
                      R$ {Number(streamer.total_earnings).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-white">
                    {streamer.total_calls}
                  </td>
                  <td className="px-6 py-4 text-center text-white">
                    {Math.floor(streamer.avg_call_duration / 60)} min
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-yellow-500">
                      ⭐ {Number(streamer.average_rating || 0).toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Distribuição de Receita (Gráfico de Pizza) */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-dark-800 p-6 rounded-2xl border border-dark-700">
          <h3 className="text-lg font-bold text-white mb-4">Distribuição de Receita</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Streamers (80%)', value: kpis.revenue.streamer_earnings },
                  { name: 'Plataforma (20%)', value: kpis.revenue.platform_fee }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[0, 1].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-dark-800 p-6 rounded-2xl border border-dark-700">
          <h3 className="text-lg font-bold text-white mb-4">Resumo Fiscal (Últimos 30 dias)</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-dark-700 pb-3">
              <span className="text-gray-400">Receita Bruta</span>
              <span className="text-white font-bold">R$ {kpis.revenue.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-dark-700 pb-3">
              <span className="text-gray-400">Pagamentos a Streamers (80%)</span>
              <span className="text-red-400 font-bold">- R$ {kpis.revenue.streamer_earnings.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-dark-700 pb-3">
              <span className="text-gray-400">Taxa da Plataforma (20%)</span>
              <span className="text-green-400 font-bold">R$ {kpis.revenue.platform_fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-dark-700 pb-3">
              <span className="text-gray-400">Impostos Estimados (15%)</span>
              <span className="text-yellow-400 font-bold">- R$ {(kpis.revenue.platform_fee * 0.15).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-white font-bold text-lg">Lucro Líquido</span>
              <span className="text-primary-500 font-bold text-2xl">
                R$ {(kpis.revenue.platform_fee * 0.85).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/50 p-4 rounded-xl">
        <p className="text-blue-400 text-sm">
          <strong>📊 Relatórios:</strong> Todos os dados são calculados em tempo real. 
          Para relatórios fiscais completos, exporte em CSV e consulte seu contador.
        </p>
      </div>
    </div>
  );
}
