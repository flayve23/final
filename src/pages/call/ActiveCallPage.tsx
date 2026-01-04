import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, PhoneOff, Clock } from 'lucide-react';
import '@livekit/components-styles';
import { 
    LiveKitRoom, 
    RoomAudioRenderer,
    ControlBar,
    useTracks,
    TrackReference,
    VideoTrack
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import api from '../../services/api';
import SessionTimer from '../../components/call/SessionTimer';

export default function ActiveCallPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [token] = useState(state?.token);
  const [url] = useState(state?.url);
  const [callId] = useState(state?.call_id);
  const [pricePerMinute] = useState(state?.price_per_minute || 10); // V104: Preço por minuto
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const hasEndedRef = useRef(false);

  // Timer visual
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime]);

  // Finalizar chamada ao sair
  useEffect(() => {
    return () => {
      if (hasEndedRef.current) return;
      
      const duration = Math.floor((Date.now() - startTime) / 1000);
      
      // Só cobrar se durou mais de 10 segundos E tem callId
      if (duration > 10 && callId) {
        hasEndedRef.current = true;
        
        api.post('/calls/end', { 
          call_id: callId, 
          duration_seconds: duration 
        })
          .then(res => {
            console.log('✅ Chamada finalizada:', res.data);
            const minutes = res.data.duration_minutes;
            const charged = res.data.charged;
            
            if (charged > 0) {
              alert(`Chamada encerrada!\n\nDuração: ${minutes} min\nValor cobrado: R$ ${charged.toFixed(2)}`);
            }
          })
          .catch(err => {
            console.error('❌ Erro ao finalizar:', err);
            if (err.response?.status === 402) {
              alert('❌ Saldo insuficiente para pagar a chamada!');
            } else {
              alert('⚠️ Erro ao processar pagamento da chamada. Entre em contato com o suporte.');
            }
          });
      }
    };
  }, [callId, startTime]);

  useEffect(() => {
    if (!token || !url) {
        alert("Sessão inválida.");
        navigate('/dashboard');
    }
  }, [token, url, navigate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    if (confirm('Deseja encerrar a chamada?')) {
      navigate('/dashboard');
    }
  };

  if (!token) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-white" />
    </div>
  );

  return (
    <div className="h-screen w-screen bg-black overflow-hidden">
        <LiveKitRoom
            video={true}
            audio={true}
            token={token}
            serverUrl={url}
            data-lk-theme="default"
            style={{ height: '100vh', width: '100vw' }}
            onDisconnected={() => navigate('/dashboard')}
            connectOptions={{
              // RC1: ICE Configuration para NAT traversal
              // LiveKit Cloud já fornece TURN servers automaticamente
              // Mas forçamos aqui para garantir conectividade
              rtcConfig: {
                iceServers: [
                  {
                    urls: 'stun:stun.l.google.com:19302' // Google STUN (fallback)
                  }
                ],
                iceTransportPolicy: 'all' // Permitir tanto STUN quanto TURN
              }
            }}
        >
            <ManualVideoGrid />
            <RoomAudioRenderer />
            
            {/* V104: Session Timer com controle de gastos em tempo real */}
            <div className="fixed top-4 right-4 z-50 w-80">
              <SessionTimer
                startTime={startTime}
                pricePerMinute={pricePerMinute}
                spendingLimit={100} // Limite de R$ 100 (pode vir do backend)
                onLimitReached={() => {
                  alert('Limite de gasto atingido! A chamada será encerrada.');
                  navigate('/dashboard');
                }}
              />
            </div>

            {/* Timer de duração */}
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-black/70 px-4 py-2 rounded-full flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-500 animate-pulse" />
                <span className="text-white font-mono text-lg">{formatTime(elapsedTime)}</span>
            </div>
            
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 flex gap-4">
                <ControlBar variation="minimal" controls={{ microphone: true, camera: true }} />
                <button 
                  onClick={handleEndCall} 
                  className="bg-red-600 p-3 rounded-full text-white hover:bg-red-500 transition-all transform hover:scale-110"
                  title="Encerrar chamada"
                >
                    <PhoneOff />
                </button>
            </div>
        </LiveKitRoom>
    </div>
  );
}

function ManualVideoGrid() {
    const tracks = useTracks([Track.Source.Camera]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 h-full w-full bg-black">
            {tracks.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-gray-600" />
                        <p>Aguardando vídeo...</p>
                        <p className="text-sm mt-2">(Verifique permissões da câmera)</p>
                        <p className="text-xs mt-4 text-gray-400">RC1: ICE Config ativado</p>
                    </div>
                </div>
            )}
            {tracks.map((trackRef: TrackReference) => (
                <div key={trackRef.participant.identity} className="relative border border-dark-800 bg-dark-900">
                    <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded text-white text-sm font-medium">
                        {trackRef.participant.name || 'Participante'} {trackRef.participant.isLocal && "🎥 (Você)"}
                    </div>
                </div>
            ))}
        </div>
    );
}
