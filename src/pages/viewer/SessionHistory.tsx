import { useEffect, useState } from 'react';
import { History, Video, DollarSign, Clock, Filter } from 'lucide-react';
import api from '../../services/api';

interface Session {
  id: number;
  streamer_name: string;
  streamer_photo?: string;
  duration_seconds: number;
  cost_total: number;
  created_at: string;
  status: string;
}

export default function SessionHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'rejected'
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    fetchSessions();
  }, [filter]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/calls/history', {
        params: { status: filter !== 'all' ? filter : undefined }
      });
      
      setSessions(response.data.sessions || []);
      setTotalSpent(response.data.total_spent || 0);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <History className="text-primary-500" />
          Histórico de Sessões
        </h1>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-dark-800 p-6 rounded-2xl border border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
              <Video className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total de Chamadas</p>
              <p className="text-2xl font-bold text-white">{sessions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-dark-800 p-6 rounded-2xl border border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Gasto</p>
              <p className="text-2xl font-bold text-white">R$ {totalSpent.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-dark-800 p-6 rounded-2xl border border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Tempo Total</p>
              <p className="text-2xl font-bold text-white">
                {Math.floor(sessions.reduce((acc, s) => acc + s.duration_seconds, 0) / 60)} min
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700">
        <div className="flex items-center gap-4">
          <Filter className="text-gray-400" />
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'completed'
                ? 'bg-green-500 text-white'
                : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            Concluídas
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'rejected'
                ? 'bg-red-500 text-white'
                : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            Rejeitadas
          </button>
        </div>
      </div>

      {/* Lista de Sessões */}
      <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Carregando histórico...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center">
            <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Nenhuma sessão encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-700">
            {sessions.map((session) => (
              <div key={session.id} className="p-6 hover:bg-dark-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  {/* Streamer Info */}
                  <div className="flex items-center gap-4">
                    <img
                      src={session.streamer_photo || '/default-avatar.png'}
                      alt={session.streamer_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-bold text-white">{session.streamer_name}</p>
                      <p className="text-sm text-gray-400">{formatDate(session.created_at)}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Duração</p>
                      <p className="font-bold text-white">{formatDuration(session.duration_seconds)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Valor</p>
                      <p className="font-bold text-primary-500">R$ {session.cost_total.toFixed(2)}</p>
                    </div>
                    <div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          session.status === 'completed'
                            ? 'bg-green-500/20 text-green-500'
                            : session.status === 'rejected'
                            ? 'bg-red-500/20 text-red-500'
                            : 'bg-gray-500/20 text-gray-500'
                        }`}
                      >
                        {session.status === 'completed'
                          ? 'Concluída'
                          : session.status === 'rejected'
                          ? 'Rejeitada'
                          : session.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
