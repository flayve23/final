import { useEffect, useState, useRef } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import api from '../../services/api.ts';
import { useNavigate } from 'react-router-dom';

export default function IncomingCallModal() {
  const [call, setCall] = useState<any>(null);
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Poll for calls every 3 seconds
    const interval = setInterval(checkIncoming, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (call && !audioRef.current) {
        // Play sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3'); // Generic Ringtone
        audio.loop = true;
        audio.play().catch(e => console.log("Audio play failed", e));
        audioRef.current = audio;
    } else if (!call && audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
    }
  }, [call]);

  const checkIncoming = async () => {
    try {
        const { data } = await api.get('/calls/incoming');
        if (data.active !== false && data.id) {
            setCall(data);
        } else {
            setCall(null);
        }
    } catch (e) { console.error(e); }
  };

  const handleAnswer = async () => {
    try {
        const { data } = await api.post('/calls/answer', { call_id: call.id, action: 'accept' });
        if (data.token) {
            // Navigate to Call Page with Token State
            navigate(`/dashboard/call/active`, { state: { token: data.token, url: data.url, room: data.room } });
            setCall(null);
        }
    } catch (e) { alert('Erro ao atender'); }
  };

  const handleReject = async () => {
    await api.post('/calls/answer', { call_id: call.id, action: 'reject' });
    setCall(null);
  };

  if (!call) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-pulse">
        <div className="bg-dark-800 p-8 rounded-full flex flex-col items-center shadow-[0_0_50px_rgba(34,197,94,0.5)] border-4 border-green-500">
            <div className="w-24 h-24 bg-dark-700 rounded-full flex items-center justify-center mb-4">
                <Video className="w-10 h-10 text-white animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Chamada Entrando!</h2>
            <p className="text-gray-400 mb-8">{call.viewer_name} quer falar com você.</p>
            
            <div className="flex gap-8">
                <button onClick={handleReject} className="p-4 bg-red-500 rounded-full hover:bg-red-600 transition-all transform hover:scale-110">
                    <PhoneOff className="w-8 h-8 text-white" />
                </button>
                <button onClick={handleAnswer} className="p-4 bg-green-500 rounded-full hover:bg-green-600 transition-all transform hover:scale-110 animate-pulse">
                    <Phone className="w-8 h-8 text-white" />
                </button>
            </div>
        </div>
    </div>
  );
}
