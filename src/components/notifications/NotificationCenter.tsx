import { useState, useEffect, useRef } from 'react'
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react'
import api from '../../services/api'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  metadata?: string
  read: number
  created_at: string
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // =====================================================
  // Fechar dropdown ao clicar fora
  // =====================================================
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // =====================================================
  // SSE: Conectar ao stream de notificações
  // =====================================================
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    // Criar EventSource com header Authorization (via query param workaround)
    const connectSSE = () => {
      const baseURL = import.meta.env.VITE_API_URL || ''
      const url = `${baseURL}/notifications/stream`
      
      // Cloudflare Workers não suporta headers customizados em EventSource
      // Solução: enviar token via query param
      const es = new EventSource(`${url}?token=${token}`)

      es.addEventListener('notification', (event) => {
        const data = JSON.parse(event.data)
        console.log('🔔 Nova notificação:', data)
        
        // Atualizar lista local
        setNotifications(prev => [...data, ...prev.filter((n: Notification) => 
          !data.find((d: Notification) => d.id === n.id)
        )].slice(0, 50))
        
        setUnreadCount(data.length)

        // Mostrar notificação do navegador (se permitido)
        if (Notification.permission === 'granted' && data[0]) {
          new Notification(data[0].title, {
            body: data[0].message,
            icon: '/logo.png'
          })
        }
      })

      es.addEventListener('heartbeat', () => {
        console.log('💓 Heartbeat recebido')
      })

      es.onerror = (error) => {
        console.error('❌ Erro no SSE:', error)
        es.close()
        // Reconectar após 5 segundos
        setTimeout(connectSSE, 5000)
      }

      eventSourceRef.current = es
    }

    // Solicitar permissão de notificações
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    connectSSE()

    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  // =====================================================
  // Carregar notificações ao abrir
  // =====================================================
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      fetchNotifications()
    }
  }, [isOpen])

  async function fetchNotifications() {
    setLoading(true)
    try {
      const { data } = await api.get('/notifications', {
        params: { limit: 20 }
      })
      setNotifications(data.notifications || [])
      setUnreadCount(data.unread_count || 0)
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // Marcar como lida
  // =====================================================
  async function markAsRead(id: string) {
    try {
      await api.post(`/notifications/${id}/read`)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: 1 } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
    }
  }

  // =====================================================
  // Marcar todas como lidas
  // =====================================================
  async function markAllAsRead() {
    try {
      await api.post('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Erro ao marcar todas:', error)
    }
  }

  // =====================================================
  // Limpar notificações antigas
  // =====================================================
  async function clearOld() {
    try {
      await api.delete('/notifications/cleanup')
      fetchNotifications()
    } catch (error) {
      console.error('Erro ao limpar:', error)
    }
  }

  // =====================================================
  // Formatar data relativa
  // =====================================================
  function formatRelativeTime(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `${diffMins}m atrás`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h atrás`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d atrás`
    
    return date.toLocaleDateString('pt-BR')
  }

  // =====================================================
  // Ícone por tipo de notificação
  // =====================================================
  function getNotificationIcon(type: string) {
    const iconClass = "w-10 h-10 rounded-full flex items-center justify-center"
    
    switch (type) {
      case 'call_incoming':
        return <div className={`${iconClass} bg-purple-500/20`}>📞</div>
      case 'payment_received':
        return <div className={`${iconClass} bg-green-500/20`}>💰</div>
      case 'kyc_approved':
        return <div className={`${iconClass} bg-blue-500/20`}>✅</div>
      case 'kyc_rejected':
        return <div className={`${iconClass} bg-red-500/20`}>❌</div>
      case 'chargeback':
        return <div className={`${iconClass} bg-orange-500/20`}>⚠️</div>
      case 'ticket_reply':
        return <div className={`${iconClass} bg-cyan-500/20`}>💬</div>
      default:
        return <div className={`${iconClass} bg-slate-500/20`}>🔔</div>
    }
  }

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-800"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h3 className="text-lg font-bold text-slate-100">
              Notificações {unreadCount > 0 && `(${unreadCount})`}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={clearOld}
                className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
                title="Limpar antigas"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400">
                Carregando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-slate-400">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-slate-700/50 transition-colors cursor-pointer ${
                      notification.read === 0 ? 'bg-purple-500/5' : ''
                    }`}
                    onClick={() => notification.read === 0 && markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notification.type)}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-slate-100">
                            {notification.title}
                          </p>
                          {notification.read === 0 && (
                            <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <p className="text-xs text-slate-500 mt-2">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-700 bg-slate-900">
              <button
                onClick={() => {
                  setIsOpen(false)
                  // Navegar para página de histórico completo
                  window.location.href = '/notifications'
                }}
                className="w-full text-sm text-purple-400 hover:text-purple-300 transition-colors text-center"
              >
                Ver todas as notificações
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
