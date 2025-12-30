import { useEffect, useState } from 'react';
import api from '../../services/api.ts';
import { Loader2, Eye, Ban, XOctagon, Video } from 'lucide-react';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

export default function AdminLiveOps() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monitorToken, setMonitorToken] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveCalls();
    // Polling a cada 10s para ver novas chamadas
    const interval = setInterval(fetchActiveCalls, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveCalls = async () => {
    try {
      const { data } = await api.get('/admin/calls/active');
      setCalls(data);
    } catch (error) {
      console.error('Erro ao buscar chamadas', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpy = async (streamerId: number, viewerId: number) => {
    try {
      // Reconstrói o nome da sala (mesma lógica do CallPage)
      const roomName = `room-${streamerId}-${viewerId}`;
      const { data } = await api.post('/admin/monitor/token', { room_name: roomName });
      setMonitorToken(data.token);
    } catch (error) {
      alert('Erro ao gerar token de monitoramento');
    }
  };

  const handleBan = async (userId: number, type: 'streamer' | 'viewer') => {
    if (!confirm(`TEM CERTEZA? Isso impedirá o ${type} de acessar a conta.`)) return;
    try {
      await api.post('/admin/users/ban', { user_id: userId, reason: 'Violação de termos' });
      alert('Usuário banido.');
      fetchActiveCalls();
    } catch (error) {
      alert('Erro ao banir.');
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 relative">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Video className="h-6 w-6 text-red-500 animate-pulse" /> Live Ops (Moderação em Tempo Real)
      </h1>

      {/* Monitor Modal */}
      {monitorToken && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl h-[80vh] bg-dark-900 rounded-xl overflow-hidden border border-red-500/50 relative">
            <div className="absolute top-4 left-4 z-50 bg-red-600 px-3 py-1 rounded text-white text-xs font-bold uppercase animate-pulse">
              MODO FANTASMA ATIVO
            </div>
            <button 
              onClick={() => setMonitorToken(null)}
              className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white"
            >
              <XOctagon className="h-6 w-6" />
            </button>
            
            <LiveKitRoom
              token={monitorToken}
              serverUrl={import.meta.env.VITE_LIVEKIT_URL || "wss://demo.livekit.cloud"}
              data-lk-theme="default"
              style={{ height: '100%' }}
            >
              <VideoConference />
            </LiveKitRoom>
          </div>
          <p className="text-gray-400 mt-4 text-sm">Você está assistindo invisivelmente. Seu microfone e câmera estão desativados.</p>
        </div>
      )}

      {/* Active Calls Table */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
        {calls.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Video className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Nenhuma chamada ativa no momento.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-dark-900/50 text-gray-400">
              <tr>
                <th className="p-4 font-medium">Início</th>
                <th className="p-4 font-medium">Streamer</th>
                <th className="p-4 font-medium">Viewer</th>
                <th className="p-4 font-medium text-right">Ações de Segurança</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {calls.map((call) => (
                <tr key={call.id} className="hover:bg-dark-700/50">
                  <td className="p-4 text-gray-400">
                    {new Date(call.started_at).toLocaleTimeString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{call.streamer_name}</span>
                      <button onClick={() => handleBan(call.streamer_id, 'streamer')} className="text-gray-600 hover:text-red-500" title="Banir Streamer">
                        <Ban className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{call.viewer_name}</span>
                      <button onClick={() => handleBan(call.viewer_id, 'viewer')} className="text-gray-600 hover:text-red-500" title="Banir Viewer">
                        <Ban className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleSpy(call.streamer_id, call.viewer_id)}
                      className="inline-flex items-center px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-md transition-all shadow-lg shadow-purple-900/20"
                    >
                      <Eye className="h-3 w-3 mr-2" /> ESPIAR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
