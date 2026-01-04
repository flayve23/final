import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Send, Paperclip, AlertCircle, Clock, CheckCircle, X } from 'lucide-react'
import api from '../../services/api'

interface Ticket {
  id: string
  subject: string
  category: string
  priority: string
  status: string
  message_count: number
  last_message?: string
  created_at: string
  last_reply_at: string
}

interface Message {
  id: string
  message: string
  username: string
  role: string
  is_admin: number
  created_at: string
}

export default function TicketSystem() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showNewTicketModal, setShowNewTicketModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Form novo ticket
  const [newTicketData, setNewTicketData] = useState({
    subject: '',
    category: 'technical',
    message: ''
  })

  useEffect(() => {
    fetchTickets()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // =====================================================
  // Carregar tickets
  // =====================================================
  async function fetchTickets() {
    setLoading(true)
    try {
      const { data } = await api.get('/tickets/my-tickets')
      setTickets(data.tickets || [])
    } catch (error) {
      console.error('Erro ao carregar tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // Carregar mensagens do ticket
  // =====================================================
  async function loadTicketMessages(ticketId: string) {
    try {
      const { data } = await api.get(`/tickets/${ticketId}`)
      setSelectedTicket(data.ticket)
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
    }
  }

  // =====================================================
  // Criar novo ticket
  // =====================================================
  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault()
    
    if (!newTicketData.subject || !newTicketData.message) {
      alert('Preencha todos os campos')
      return
    }

    setLoading(true)
    try {
      await api.post('/tickets', newTicketData)
      setShowNewTicketModal(false)
      setNewTicketData({ subject: '', category: 'technical', message: '' })
      fetchTickets()
      alert('Ticket criado com sucesso!')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao criar ticket')
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // Enviar mensagem
  // =====================================================
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    
    if (!newMessage.trim() || !selectedTicket) return

    setLoading(true)
    try {
      await api.post(`/tickets/${selectedTicket.id}/reply`, {
        message: newMessage
      })
      setNewMessage('')
      // Recarregar mensagens
      loadTicketMessages(selectedTicket.id)
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao enviar mensagem')
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // Status badge
  // =====================================================
  function getStatusBadge(status: string) {
    const badges: any = {
      open: { color: 'bg-green-500/20 text-green-400', icon: AlertCircle, label: 'Aberto' },
      in_progress: { color: 'bg-blue-500/20 text-blue-400', icon: Clock, label: 'Em Andamento' },
      waiting_user: { color: 'bg-yellow-500/20 text-yellow-400', icon: Clock, label: 'Aguardando Você' },
      waiting_admin: { color: 'bg-purple-500/20 text-purple-400', icon: Clock, label: 'Aguardando Suporte' },
      resolved: { color: 'bg-green-500/20 text-green-400', icon: CheckCircle, label: 'Resolvido' },
      closed: { color: 'bg-slate-500/20 text-slate-400', icon: CheckCircle, label: 'Fechado' }
    }

    const badge = badges[status] || badges.open
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <MessageCircle className="w-8 h-8 text-purple-500" />
              Central de Suporte
            </h1>
            <p className="text-slate-400 mt-1">Seus tickets e conversas com o suporte</p>
          </div>
          
          <button
            onClick={() => setShowNewTicketModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg"
          >
            + Novo Ticket
          </button>
        </div>

        {/* Layout: Lista + Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Lista de Tickets */}
          <div className="lg:col-span-1 bg-slate-800 border border-slate-700 rounded-xl p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-100 mb-4">Meus Tickets</h2>
            
            {loading && tickets.length === 0 ? (
              <div className="text-center py-8 text-slate-400">Carregando...</div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Nenhum ticket ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map(ticket => (
                  <div
                    key={ticket.id}
                    onClick={() => loadTicketMessages(ticket.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedTicket?.id === ticket.id
                        ? 'bg-purple-500/10 border-purple-500'
                        : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-slate-100 text-sm line-clamp-1">
                        {ticket.subject}
                      </h3>
                      {getStatusBadge(ticket.status)}
                    </div>
                    
                    <p className="text-xs text-slate-400 mb-2">
                      {getCategoryLabel(ticket.category)}
                    </p>
                    
                    {ticket.last_message && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-2">
                        {ticket.last_message}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{ticket.message_count} mensagens</span>
                      <span>{new Date(ticket.last_reply_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat do Ticket */}
          <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl flex flex-col max-h-[calc(100vh-200px)]">
            {selectedTicket ? (
              <>
                {/* Header do Chat */}
                <div className="p-4 border-b border-slate-700">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-100">{selectedTicket.subject}</h2>
                      <p className="text-sm text-slate-400 mt-1">
                        {getCategoryLabel(selectedTicket.category)} • Ticket #{selectedTicket.id.substring(0, 8)}
                      </p>
                    </div>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                </div>

                {/* Mensagens */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[70%] ${
                        msg.is_admin 
                          ? 'bg-slate-700 text-slate-100' 
                          : 'bg-purple-600 text-white'
                      } rounded-lg p-4`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-sm">
                            {msg.is_admin ? '🛠️ Suporte' : msg.username}
                          </span>
                          {msg.role === 'admin' && (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                              Admin
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        
                        <p className="text-xs opacity-70 mt-2">
                          {new Date(msg.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input de Mensagem */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={loading}
                    />
                    <button
                      type="submit"
                      disabled={loading || !newMessage.trim()}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      Enviar
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <MessageCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">Selecione um ticket para ver as mensagens</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Novo Ticket */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-100">Novo Ticket</h2>
              <button
                onClick={() => setShowNewTicketModal(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Assunto
                </label>
                <input
                  type="text"
                  value={newTicketData.subject}
                  onChange={(e) => setNewTicketData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500"
                  placeholder="Ex: Problema ao fazer recarga"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Categoria
                </label>
                <select
                  value={newTicketData.category}
                  onChange={(e) => setNewTicketData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="technical">Técnico</option>
                  <option value="payment">Pagamento</option>
                  <option value="account">Conta</option>
                  <option value="abuse">Denúncia</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mensagem
                </label>
                <textarea
                  value={newTicketData.message}
                  onChange={(e) => setNewTicketData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 min-h-[120px]"
                  placeholder="Descreva seu problema em detalhes..."
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-6 py-3 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  {loading ? 'Criando...' : 'Criar Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
