import { useState, useEffect } from 'react'
import { Heart, Star, Video, Clock, Bell, BellOff, Trash2 } from 'lucide-react'
import api from '../../services/api'

interface Favorite {
  id: string
  streamer_id: string
  username: string
  avatar_url?: string
  bio?: string
  price_per_minute: number
  is_online: number
  last_seen_at: string
  total_calls: number
  notify_on_online: number
  created_at: string
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFavorites()
  }, [])

  // =====================================================
  // Carregar favoritos
  // =====================================================
  async function fetchFavorites() {
    setLoading(true)
    try {
      const { data } = await api.get('/favorites')
      setFavorites(data.favorites || [])
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error)
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // Remover favorito
  // =====================================================
  async function handleRemoveFavorite(streamerId: string) {
    if (!confirm('Remover dos favoritos?')) return

    try {
      await api.delete(`/favorites/${streamerId}`)
      fetchFavorites()
    } catch (error) {
      alert('Erro ao remover favorito')
    }
  }

  // =====================================================
  // Toggle notificações
  // =====================================================
  async function handleToggleNotify(streamerId: string, currentValue: number) {
    try {
      await api.put(`/favorites/${streamerId}/notify`, {
        notify_on_online: currentValue === 1 ? 0 : 1
      })
      fetchFavorites()
    } catch (error) {
      alert('Erro ao atualizar notificações')
    }
  }

  // =====================================================
  // Iniciar chamada
  // =====================================================
  function handleStartCall(streamerId: string) {
    window.location.href = `/call/${streamerId}`
  }

  // =====================================================
  // Formatar última vez online
  // =====================================================
  function formatLastSeen(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 5) return 'Online agora'
    if (diffMins < 60) return `Visto ${diffMins}m atrás`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Visto ${diffHours}h atrás`
    
    const diffDays = Math.floor(diffHours / 24)
    return `Visto ${diffDays}d atrás`
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
            <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
            Meus Favoritos
          </h1>
          <p className="text-slate-400 mt-1">
            Streamers que você adicionou aos favoritos
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Carregando...</div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-slate-600" />
            </div>
            <h2 className="text-xl font-medium text-slate-300 mb-2">
              Nenhum favorito ainda
            </h2>
            <p className="text-slate-500 mb-6">
              Adicione streamers aos favoritos para acompanhar quando ficarem online
            </p>
            <button
              onClick={() => window.location.href = '/explore'}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Explorar Streamers
            </button>
          </div>
        ) : (
          <>
            {/* Online Count */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <p className="text-green-400 font-medium">
                  {favorites.filter(f => f.is_online === 1).length} de {favorites.length} favoritos online agora
                </p>
              </div>
            </div>

            {/* Grid de Favoritos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map(fav => (
                <div
                  key={fav.id}
                  className={`bg-slate-800 border rounded-xl overflow-hidden transition-all hover:shadow-xl ${
                    fav.is_online === 1
                      ? 'border-green-500/50 hover:border-green-500'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {/* Avatar + Status */}
                  <div className="relative">
                    <div className="h-48 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                      {fav.avatar_url ? (
                        <img
                          src={fav.avatar_url}
                          alt={fav.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-white text-6xl font-bold">
                          {fav.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Online Badge */}
                    {fav.is_online === 1 && (
                      <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2 shadow-lg">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        ONLINE
                      </div>
                    )}

                    {/* Favorite Badge */}
                    <div className="absolute top-4 left-4">
                      <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-xl font-bold text-slate-100 mb-1">
                      {fav.username}
                    </h3>

                    {fav.bio && (
                      <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                        {fav.bio}
                      </p>
                    )}

                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-slate-400">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {formatLastSeen(fav.last_seen_at)}
                      </div>
                      <div className="text-sm font-medium text-green-400">
                        R$ {fav.price_per_minute.toFixed(2)}/min
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                      <span>
                        <Star className="w-3 h-3 inline mr-1 text-yellow-500" />
                        {fav.total_calls} chamadas
                      </span>
                      <span>
                        Favorito desde {new Date(fav.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartCall(fav.streamer_id)}
                        disabled={fav.is_online === 0}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                          fav.is_online === 1
                            ? 'bg-purple-600 hover:bg-purple-700 text-white'
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Video className="w-4 h-4" />
                        Chamar
                      </button>

                      <button
                        onClick={() => handleToggleNotify(fav.streamer_id, fav.notify_on_online)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          fav.notify_on_online === 1
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-400'
                        }`}
                        title={fav.notify_on_online === 1 ? 'Notificações ativadas' : 'Notificações desativadas'}
                      >
                        {fav.notify_on_online === 1 ? (
                          <Bell className="w-4 h-4" />
                        ) : (
                          <BellOff className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => handleRemoveFavorite(fav.streamer_id)}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                        title="Remover dos favoritos"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
