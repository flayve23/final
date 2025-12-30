import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api.ts';
import { Loader2, Video, Star, Share2 } from 'lucide-react';

export default function PublicProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch public profile data (no token needed)
    api.get(`/profiles/public/${id}`)
       .then(res => setProfile(res.data))
       .catch(err => console.error(err))
       .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-primary-500" /></div>;
  if (!profile) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Perfil não encontrado.</div>;

  return (
    <div className="min-h-screen bg-black text-white">
        {/* Cover / Header */}
        <div className="h-64 bg-gradient-to-b from-primary-900/40 to-black relative">
            <Link to="/" className="absolute top-6 left-6 text-white font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">
                ← Voltar para Flayve
            </Link>
        </div>

        <div className="max-w-3xl mx-auto px-4 -mt-32 relative z-10">
            <div className="flex flex-col items-center text-center">
                <div className="w-48 h-48 rounded-full border-4 border-black overflow-hidden shadow-2xl mb-6">
                    <img src={profile.photo_url || `https://ui-avatars.com/api/?name=${profile.username}`} className="w-full h-full object-cover" />
                </div>
                
                <h1 className="text-4xl font-black mb-2 flex items-center gap-2">
                    {profile.bio_name || profile.username}
                    {profile.is_online && <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" title="Online"></span>}
                </h1>
                
                <div className="flex items-center gap-1 text-yellow-400 mb-6">
                    <Star className="fill-current w-5 h-5" />
                    <span className="font-bold text-lg">5.0</span>
                    <span className="text-gray-500 text-sm ml-2">(Novidade)</span>
                </div>

                <p className="text-gray-300 max-w-lg mb-8 leading-relaxed text-lg">
                    {profile.bio_description || "Olá! Bem-vindo ao meu perfil exclusivo. Me chame para uma conversa privada."}
                </p>

                <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-8">
                    <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700">
                        <span className="block text-gray-500 text-xs uppercase">Valor</span>
                        <span className="text-xl font-bold text-white">R$ {profile.price_per_minute}/min</span>
                    </div>
                    <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700">
                        <span className="block text-gray-500 text-xs uppercase">Status</span>
                        <span className={`text-xl font-bold ${profile.is_online ? 'text-green-500' : 'text-gray-400'}`}>
                            {profile.is_online ? 'Online Agora' : 'Offline'}
                        </span>
                    </div>
                </div>

                <Link 
                    to={`/dashboard/call/${profile.user_id}`}
                    className="w-full max-w-md py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-2xl text-xl shadow-lg shadow-primary-900/50 transition-all transform hover:scale-105 flex items-center justify-center gap-3"
                >
                    <Video className="w-6 h-6" />
                    Entrar para Ligar
                </Link>
                
                <p className="mt-4 text-sm text-gray-500">
                    Ao clicar, você será redirecionado para o login.
                </p>
            </div>
        </div>
    </div>
  );
}
