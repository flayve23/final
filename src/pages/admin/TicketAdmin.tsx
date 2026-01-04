import { useState, useEffect } from 'react'
import { MessageCircle, Filter, User, Clock, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react'
import api from '../../services/api'

interface Ticket {
  id: string
  user_id: string
  username: string
  subject: string
  category: string
  priority: string
  status: string
  message_count: number
  assigned_to?: string
  created_at: string
  last_reply_at: string
}

interface TicketStats {
  open: number
  in_progress: number
  waiting_user: number
  waiting_admin: number
  resolved: number
  closed: number
  total: number
}

export default function TicketAdmin() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [stats, setStats] = useState<TicketStats | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  useEffect(() => {
    fetchTickets()
  }, [statusFilter, priorityFilter])

  // =====================================================
  // Carregar tickets
  // =====================================================
  async function fetchTickets() {
    setLoading(true)
    try {
      const { data } = await api.get('/tickets/admin/all', {
        params: {
          status: statusFilter || undefined,
          priority: priorityFilter || undefined
        }
      })
      
      setTickets(data.tickets || [])
      
      // Calcular estatísticas
      const stats: TicketStats = {
        open: 0,
        in_progress: 0,
        waiting_user: 0,
        waiting_admin: 0,
        resolved: 0,
        closed: 0,
        total: data.tickets?.length || 0
      }
      
      data.tickets?.forEach((ticket: Ticket) => {
        if (ticket.status in stats) {
          stats[ticket.status as keyof TicketStats]++
        }
      })
      
      setStats(stats)
    } catch (error) {
      console.error('Erro ao carregar tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // Atualizar ticket
  // =====================================================
  async function handleUpdateTicket(ticketId: string, updates: any) {
    try {
      await api.patch(`/tickets/${ticketId}`, updates)
      fetchTickets()
      alert('Ticket atualizado!')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao atualizar ticket')
    }
  }

  // =====================================================
  // Status badge
  // =====================================================
  function getStatusBadge(status: string) {
    const badges: any = {
      open: { color: 'bg-green-500/20 text-green-400 border-green-500/50', label: 'Aberto', icon: AlertCircle },
      in_progress: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', label: 'Em Andamento', icon: Clock },
      waiting_user: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', label: 'Aguardando Usuário', icon: Clock },
      waiting_admin: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', label: 'Aguardando Suporte', icon: AlertCircle },
      resolved: { color: 'bg-green-500/20 text-green-400 border-green-500/50', label: 'Resolvido', icon: CheckCircle },
      closed: { color: 'bg-slate-500/20 text-slate-400 border-slate-500/50', label: 'Fechado', icon: CheckCircle }
    }

    const badge = badges[status] || badges.open
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    )
  }

  // =====================================================
  // Prioridade badge
  // =====================================================
  function getPriorityBadge(priority: string) {
    const badges: any = {
      low: { color: 'bg-slate-500/20 text-slate-400', label: 'Baixa' },
      normal: { color: 'bg-blue-500/20 text-blue-400', label: 'Normal' },
      high: { color: 'bg-orange-500/20 text-orange-400', label: 'Alta' },
      urgent: { color: 'bg-red-500/20 text-red-400', label: 'Urgente' }
    }

    const badge = badges[priority] || badges.normal

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  // =====================================================
  // Categoria label
  // =====================================================
  function getCategoryLabel(category: string) {
    const labels: any = {
      technical: 'Técnico',
      payment: 'Pagamento',
      account: 'Conta',
      abuse: 'Denúncia',
      other: 'Outro'
    }
    return labels[category] || category
  }

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-purple-500" />
            Gerenciamento de Tickets
          </h1>
          <p className="text-slate-400 mt-1">Painel administrativo de suporte</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4">
              <div className="text-green-400 text-2xl font-bold">{stats.open}</div>
              <div className="text-green-300 text-sm">Abertos</div>
            </div>
            <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
              <div className="text-blue-400 text-2xl font-bold">{stats.in_progress}</div>
              <div className="text-blue-300 text-sm">Em Andamento</div>
            </div>
            <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4">
              <div className="text-yellow-400 text-2xl font-bold">{stats.waiting_user}</div>
              <div className="text-yellow-300 text-sm">Aguardando</div>
            </div>
            <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4">
              <div className="text-purple-400 text-2xl font-bold">{stats.waiting_admin}</div>
              <div className="text-purple-300 text-sm">Urgente</div>
            </div>
            <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4">
              <div className="text-green-400 text-2xl font-bold">{stats.resolved}</div>
              <div className="text-green-300 text-sm">Resolvidos</div>
            </div>
            <div className="bg-slate-600/10 border border-slate-600/30 rounded-lg p-4">
              <div className="text-slate-400 text-2xl font-bold">{stats.total}</div>
              <div className="text-slate-300 text-sm">Total</div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-slate-400" />
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2"
            >
              <option value="">Todos os Status</option>
              <option value="open">Aberto</option>
              <option value="in_progress">Em Andamento</option>
              <option value="waiting_user">Aguardando Usuário</option>
              <option value="waiting_admin">Aguardando Suporte</option>
              <option value="resolved">Resolvido</option>
              <option value="closed">Fechado</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2"
            >
              <option value="">Todas as Prioridades</option>
              <option value="low">Baixa</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>

            <button
              onClick={fetchTickets}
              className="ml-auto bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Atualizar
            </button>
          </div>
        </div>

        {/* Lista de Tickets */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Carregando...</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhum ticket encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">ID</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Usuário</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Assunto</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Categoria</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Prioridade</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Status</th>
                    <th className="text-center py-3 px-4 text-slate-300 font-medium">Msgs</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Última</th>
                    <th className="text-center py-3 px-4 text-slate-300 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(ticket => (
                    <tr 
                      key={ticket.id}
                      className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <code className="text-xs text-purple-400">
                          {ticket.id.substring(0, 8)}
                        </code>
                      </td>
                      <td className="py-3 px-4 text-slate-200">
                        {ticket.username}
                      </td>
                      <td className="py-3 px-4 text-slate-200 max-w-xs truncate">
                        {ticket.subject}
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-sm">
                        {getCategoryLabel(ticket.category)}
                      </td>
                      <td className="py-3 px-4">
                        {getPriorityBadge(ticket.priority)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(ticket.status)}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-300">
                        {ticket.message_count}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-sm">
                        {new Date(ticket.last_reply_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => window.location.href = `/support?ticket=${ticket.id}`}
                            className="text-purple-400 hover:text-purple-300 transition-colors text-sm"
                          >
                            Ver
                          </button>
                          
                          <select
                            value={ticket.status}
                            onChange={(e) => handleUpdateTicket(ticket.id, { status: e.target.value })}
                            className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
                          >
                            <option value="open">Abrir</option>
                            <option value="in_progress">Andamento</option>
                            <option value="waiting_user">Aguardar</option>
                            <option value="resolved">Resolver</option>
                            <option value="closed">Fechar</option>
                          </select>
                          
                          <select
                            value={ticket.priority}
                            onChange={(e) => handleUpdateTicket(ticket.id, { priority: e.target.value })}
                            className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
                          >
                            <option value="low">Baixa</option>
                            <option value="normal">Normal</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                          </select>
                        </div>
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
