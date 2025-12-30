import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api.ts';
import { Loader2, Mic, MicOff, Video, VideoOff, PhoneOff, AlertTriangle } from 'lucide-react';
import '@livekit/components-styles';
import { LiveKitRoom, VideoConference, useRoomContext } from '@livekit/components-react';

export default function CallPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    const joinCall = async () => {
      try {
        // 1. Get Token from Backend
        const { data } = await api.post('/calls/join', { streamer_id: id });
        
        setToken(data.token);
        setRoomName(data.room);
        setServerUrl(data.url); // Use URL from backend
        
      } catch (err: any) {
        console.error(err);
        // FIX V100: Show error instead of redirecting
        setError(err.response?.data?.error || err.message || 'Erro desconhecido ao iniciar chamada.');
      }
    };

    if (id && user) {
      joinCall();
    }
  }, [id, user]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/50 max-w-md">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Falha na Conexão</h2>
            <p className="text-red-200 mb-6 font-mono text-sm">{error}</p>
            <button 
                onClick={() => navigate('/dashboard/viewer')}
                className="px-6 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-bold"
            >
                Voltar para o Explorar
            </button>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 text-primary-500 animate-spin mb-4" />
        <p className="text-gray-400">Conectando ao servidor seguro...</p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={serverUrl}
      data-lk-theme="default"
      style={{ height: '100vh' }}
      onDisconnected={() => navigate('/dashboard')}
    >
      <MyVideoConference />
    </LiveKitRoom>
  );
}

function MyVideoConference() {
  const room = useRoomContext();
  const navigate = useNavigate();
  // Simple layout wrapper
  return (
    <div className="relative h-full">
        <VideoConference />
        <div className="absolute top-4 left-4 z-50">
            <button onClick={() => { room.disconnect(); navigate('/dashboard'); }} className="bg-red-600 px-4 py-2 rounded-lg font-bold text-white shadow-lg">
                Encerrar
            </button>
        </div>
    </div>
  );
}
