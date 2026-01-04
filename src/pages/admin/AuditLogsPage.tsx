import { useState, useEffect } from 'react'
import { Shield, Search, Download, Filter, Calendar } from 'lucide-react'
import api from '../../services/api'

interface AuditLog {
  id: string
  user_id: string
  username?: string
  action: string
  entity_type?: string
  entity_id?: string
  changes?: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Filtros
  const [searchUser, setSearchUser] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [page, filterAction, filterEntity])

  // =====================================================
  // Carregar logs
  // =====================================================
  async function fetchLogs() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/audit-logs', {
        params: {
          page,
          limit: 50,
          action: filterAction || undefined,
          entity_type: filterEntity || undefined
        }
      })
      
      if (page === 1) {
        setLogs(data.logs || [])
      } else {
        setLogs(prev => [...prev, ...(data.logs || [])])
      }
      
      setHasMore((data.logs?.length || 0) === 50)
    } catch (error) {
      console.error('Erro ao carregar logs:', error)
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // Buscar por usuário
  // =====================================================
  function handleSearch() {
    if (!searchUser.trim()) {
      fetchLogs()
      return
    }

    setLoading(true)
    api.get('/admin/audit-logs', {
      params: { username: searchUser }
    })
      .then(({ data }) => {
        setLogs(data.logs || [])
        setHasMore(false)
      })
      .catch(err => console.error('Erro ao buscar:', err))
      .finally(() => setLoading(false))
  }

  // =====================================================
  // Exportar CSV
  // =====================================================
  async function handleExport() {
    try {
      const { data } = await api.get('/admin/audit-logs/export', {
        params: {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined
        },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `audit_logs_${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      alert('Erro ao exportar logs')
    }
  }

  // =====================================================
  // Formatar ação (label)
  // =====================================================
  function getActionLabel(action: string) {
    const labels: any = {
      'user_created': 'Usuário Criado',
      'user_updated': 'Usuário Atualizado',
      'user_deleted': 'Usuário Deletado',
      'kyc_submitted': 'KYC Enviado',
      'kyc_approved': 'KYC Aprovado',
      'kyc_rejected': 'KYC Rejeitado',
      'call_started': 'Chamada Iniciada',
      'call_ended': 'Chamada Encerrada',
      'payment_received': 'Pagamento Recebido',
      'withdrawal_requested': 'Saque Solicitado',
      'chargeback_detected': 'Chargeback Detectado',
      'admin_action': 'Ação Administrativa'
    }
    return labels[action] || action
  }

  // =====================================================
  // Badge de ação (cor)
  // =====================================================
  function getActionBadge(action: string) {
    const colors: any = {
      'user_created': 'bg-green-500/20 text-green-400',
      'user_deleted': 'bg-red-500/20 text-red-400',
      'kyc_approved': 'bg-blue-500/20 text-blue-400',
      'kyc_rejected': 'bg-red-500/20 text-red-400',
      'payment_received': 'bg-green-500/20 text-green-400',
      'chargeback_detected': 'bg-orange-500/20 text-orange-400',
      'admin_action': 'bg-purple-500/20 text-purple-400'
    }

    const color = colors[action] || 'bg-slate-500/20 text-slate-400'

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
        {getActionLabel(action)}
      </span>
    )
  }

  // =====================================================
  // Parsear mudanças (JSON)
  // =====================================================
  function parseChanges(changes?: string) {
    if (!changes) return null
    
    try {
      const parsed = JSON.parse(changes)
      return (
        <details className="text-xs">
          <summary className="cursor-pointer text-purple-400 hover:text-purple-300">
            Ver alterações
          </summary>
          <pre className="mt-2 bg-slate-900 p-2 rounded overflow-x-auto">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        </details>
      )
    } catch {
      return <span className="text-xs text-slate-500">{changes}</span>
    }
  }

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-500" />
              Logs de Auditoria
            </h1>
            <p className="text-slate-400 mt-1">Histórico completo de ações na plataforma</p>
          </div>

          <button
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Buscar Usuário */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">Buscar Usuário</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Username..."
                  className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={handleSearch}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filtrar Ação */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">Ação</label>
              <select
                value={filterAction}
                onChange={(e) => { setFilterAction(e.target.value); setPage(1) }}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                <option value="user_created">Usuário Criado</option>
                <option value="kyc_submitted">KYC Enviado</option>
                <option value="kyc_approved">KYC Aprovado</option>
                <option value="kyc_rejected">KYC Rejeitado</option>
                <option value="call_started">Chamada Iniciada</option>
                <option value="payment_received">Pagamento</option>
                <option value="chargeback_detected">Chargeback</option>
                <option value="admin_action">Ação Admin</option>
              </select>
            </div>

            {/* Filtrar Entidade */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">Entidade</label>
              <select
                value={filterEntity}
                onChange={(e) => { setFilterEntity(e.target.value); setPage(1) }}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                <option value="user">Usuário</option>
                <option value="kyc">KYC</option>
                <option value="call">Chamada</option>
                <option value="transaction">Transação</option>
                <option value="ticket">Ticket</option>
              </select>
            </div>

            {/* Data Range */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Período
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-2 text-sm"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Logs */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {loading && logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">Carregando logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">Nenhum log encontrado</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900">
                    <tr>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Data/Hora</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Usuário</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Ação</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Entidade</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">ID Entidade</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Mudanças</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr 
                        key={log.id}
                        className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="py-3 px-4 text-slate-400 text-sm whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-slate-200 font-medium">
                          {log.username || log.user_id.substring(0, 8)}
                        </td>
                        <td className="py-3 px-4">
                          {getActionBadge(log.action)}
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-sm">
                          {log.entity_type || '-'}
                        </td>
                        <td className="py-3 px-4">
                          {log.entity_id ? (
                            <code className="text-xs text-purple-400">
                              {log.entity_id.substring(0, 8)}
                            </code>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          {parseChanges(log.changes)}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-xs">
                          {log.ip_address || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="border-t border-slate-700 p-4 text-center">
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    {loading ? 'Carregando...' : 'Carregar Mais'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
