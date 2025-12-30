import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api.ts';
import { Search, Star, Video, Loader2, Heart, AlertTriangle, PhoneOutgoing } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StoriesBar from '../../components/ui/StoriesBar';

export default function ViewerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [streamers, setStreamers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmCall, setConfirmCall] = useState<any>(null);
  const [callingState, setCallingState] = useState<'idle' | 'calling'>('idle');
  const [callTimer, setCallTimer] = useState(30);
  const pollRef = useRef<any>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/profiles');
      setStreamers(data);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const proceedToCall = async () => {
      setCallingState('calling');
      setCallTimer(30);
      
      try {
          // 1. Request
          const { data } = await api.post('/calls/request', { streamer_id: confirmCall.user_id });
          const callId = data.call_id;

          // 2. Poll Loop
          pollRef.current = setInterval(async () => {
              setCallTimer(prev => {
                  if (prev <= 1) {
                      clearInterval(pollRef.current);
                      handleTimeout();
                      return 0;
                  }
                  return prev - 1;
              });

              try {
                  const statusRes = await api.get(`/calls/status/${callId}`);
                  if (statusRes.data.status === 'accepted') {
                      clearInterval(pollRef.current);
                      navigate(`/dashboard/call/active`, { 
                          state: { 
                              token: statusRes.data.token, 
                              url: statusRes.data.url, 
                              room: statusRes.data.room 
                          } 
                      });
                  } else if (statusRes.data.status === 'rejected') {
                      clearInterval(pollRef.current);
                      alert('A modelo está ocupada ou recusou.');
                      setCallingState('idle');
                      setConfirmCall(null);
                  }
              } catch (e) { /* ignore poll errors */ }
          }, 1000);

      } catch (e: any) {
          alert(e.response?.data?.error || 'Erro ao chamar.');
          setCallingState('idle');
      }
  };

  const handleTimeout = () => {
      alert('Sem resposta. Tente novamente mais tarde.');
      setCallingState('idle');
      setConfirmCall(null);
  }

  const cancelCall = () => {
      if (pollRef.current) clearInterval(pollRef.current);
      setCallingState('idle');
      setConfirmCall(null);
  }

  // Filter
  const filtered = streamers.filter(s => s.username.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-fade-in relative">
      <StoriesBar />
      
      {/* Modal de Chamada */}
      {confirmCall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-dark-800 border border-dark-600 p-6 rounded-2xl max-w-sm w-full shadow-2xl text-center">
                  {callingState === 'calling' ? (
                      <div className="py-8">
                          <div className="relative w-20 h-20 mx-auto mb-4">
                              <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
                              <div className="relative bg-dark-700 w-20 h-20 rounded-full flex items-center justify-center border-4 border-green-500">
                                  <PhoneOutgoing className="w-8 h-8 text-white" />
                              </div>
                          </div>
                          <h3 className="text-xl font-bold text-white animate-pulse">Chamando {confirmCall.username}...</h3>
                          <p className="text-gray-400 mt-2 text-sm">Aguardando resposta ({callTimer}s)</p>
                          <button onClick={cancelCall} className="mt-6 text-red-400 text-sm hover:underline">Cancelar</button>
                      </div>
                  ) : (
                      <>
                        <h3 className="text-xl font-bold text-white mb-2">Iniciar Chamada?</h3>
                        <div className="bg-dark-900 p-4 rounded-xl mb-4 border border-dark-700">
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-400">Modelo</span><span className="text-white font-bold">{confirmCall.username}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Preço</span><span className="text-primary-400 font-bold text-lg">R$ {confirmCall.price_per_minute}/min</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmCall(null)} className="flex-1 py-3 bg-dark-700 rounded-xl text-gray-300 font-bold">Cancelar</button>
                            <button onClick={proceedToCall} className="flex-1 py-3 bg-green-600 rounded-xl text-white font-bold hover:bg-green-500">Ligar Agora</button>
                        </div>
                      </>
                  )}
              </div>
          </div>
      )}

      {/* Grid de Modelos (Same visual as before) */}
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-white focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
      </div>

      {loading ? <Loader2 className="mx-auto animate-spin" /> : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((s) => (
            <div key={s.id} className="bg-dark-800 rounded-2xl overflow-hidden cursor-pointer border border-dark-700 hover:border-primary-500" onClick={() => setConfirmCall(s)}>
               <div className="aspect-[3/4] relative bg-dark-700">
                  <img src={s.photo_url || `https://ui-avatars.com/api/?name=${s.username}`} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent">
                     <h3 className="font-bold text-white">{s.username}</h3>
                     <span className="text-xs text-green-400 font-bold">{s.is_online ? 'ONLINE' : 'OFFLINE'}</span>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
