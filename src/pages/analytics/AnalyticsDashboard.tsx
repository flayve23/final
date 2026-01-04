import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, Clock, DollarSign, Download } from 'lucide-react'
import api from '../../services/api'

interface KPIs {
  total_calls: number
  total_duration: number
  avg_call_duration: number
  total_revenue: number
  new_users: number
}

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [revenueChart, setRevenueChart] = useState<any[]>([])
  const [topStreamers, setTopStreamers] = useState<any[]>([])

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdmin = user.role === 'admin'

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  // =====================================================
  // Carregar analytics
  // =====================================================
  async function fetchAnalytics() {
    setLoading(true)
    try {
      const { data } = await api.get('/analytics/overview', {
        params: { period }
      })
      
      setKpis(data.kpis)
      setRevenueChart(data.revenue_chart || [])
      setTopStreamers(data.top_streamers || [])
    } catch (error) {
      console.error('Erro ao carregar analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // Exportar CSV
  // =====================================================
  async function handleExport(type: string) {
    try {
      const response = await api.get('/analytics/export/csv', {
        params: { type, period },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report_${type}_${period}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      alert('Erro ao exportar relatório')
    }
  }

  // =====================================================
  // Formatar valores
  // =====================================================
  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  function formatDuration(seconds: number) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  // =====================================================
  // Cores para gráficos
  // =====================================================
  const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899']

  // =====================================================
  // RENDER
  // =====================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Carregando analytics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-purple-500" />
              Analytics Dashboard
            </h1>
            <p className="text-slate-400 mt-1">Métricas e insights da plataforma</p>
          </div>

          {/* Filtro de Período */}
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-4 py-2"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="1y">Último ano</option>
            </select>

            {isAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('calls')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Chamadas
                </button>
                <button
                  onClick={() => handleExport('revenue')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Receita
                </button>
              </div>
            )}
          </div>
        </div>

        {/* KPIs Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Total Chamadas */}
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm">Total de Chamadas</p>
                <p className="text-white text-3xl font-bold mt-1">
                  {kpis?.total_calls || 0}
                </p>
              </div>
              <Users className="w-12 h-12 text-purple-200 opacity-80" />
            </div>
          </div>

          {/* Tempo Total */}
          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm">Tempo Total</p>
                <p className="text-white text-3xl font-bold mt-1">
                  {formatDuration(kpis?.total_duration || 0)}
                </p>
              </div>
              <Clock className="w-12 h-12 text-green-200 opacity-80" />
            </div>
          </div>

          {/* Receita Total */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Receita Total</p>
                <p className="text-white text-3xl font-bold mt-1">
                  {formatCurrency(kpis?.total_revenue || 0)}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-blue-200 opacity-80" />
            </div>
          </div>

          {/* Tempo Médio */}
          <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-200 text-sm">Duração Média</p>
                <p className="text-white text-3xl font-bold mt-1">
                  {Math.round((kpis?.avg_call_duration || 0) / 60)}min
                </p>
              </div>
              <Clock className="w-12 h-12 text-orange-200 opacity-80" />
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfico de Receita */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Receita Diária</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94A3B8"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  dot={{ fill: '#8B5CF6', r: 5 }}
                  name="Receita (R$)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Transações */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Transações Diárias</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94A3B8"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="transactions" 
                  fill="#10B981"
                  name="Transações"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Streamers */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Top Streamers por Receita</h2>
          
          {topStreamers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              Nenhum dado disponível para o período
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">#</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Streamer</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-medium">Chamadas</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-medium">Tempo Total</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-medium">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {topStreamers.map((streamer, index) => (
                    <tr 
                      key={streamer.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                          index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                          index === 1 ? 'bg-slate-500/20 text-slate-400' :
                          index === 2 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-slate-700 text-slate-400'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-medium">
                        {streamer.username}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {streamer.total_calls}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {Math.round((streamer.total_minutes || 0) / 60)}min
                      </td>
                      <td className="py-3 px-4 text-right text-green-400 font-bold">
                        {formatCurrency(streamer.total_revenue || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
