import { useEffect, useState } from 'react';
import api from '../../services/api.ts';
import { Loader2, Camera, Save, Share2, Eye, EyeOff } from 'lucide-react';

export default function StreamerProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get('/profiles/me').then(res => setProfile(res.data)).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/profiles/me', profile);
      alert('Perfil salvo com sucesso!');
    } catch (e: any) { 
        alert(`Erro ao salvar: ${e.response?.data?.error || e.message}`); 
    }
    finally { setSaving(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    const file = e.target.files[0];
    
    // Convert to Base64
    const reader = new FileReader();
    reader.onloadend = async () => {
        try {
            const base64 = reader.result;
            const { data } = await api.post('/storage/upload-base64', {
                image: base64,
                folder: 'avatars'
            });
            setProfile({ ...profile, photo_url: data.url });
        } catch (err: any) {
            alert(`Erro no upload: ${err.response?.data?.error || 'Tente uma imagem menor.'}`);
        } finally {
            setUploading(false);
        }
    };
    reader.readAsDataURL(file);
  };

  const copyLink = () => {
    const link = `${window.location.origin}/p/${profile.user_id}`;
    navigator.clipboard.writeText(link);
    alert('Link copiado!');
  };

  if (loading) return <Loader2 className="animate-spin mx-auto mt-20" />;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
         <h1 className="text-2xl font-bold text-white">Editar Perfil</h1>
         <button onClick={copyLink} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-white font-bold">
            <Share2 className="h-4 w-4" /> Compartilhar
         </button>
      </div>

      <div className="bg-dark-800 p-8 rounded-2xl border border-dark-700">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer w-32 h-32">
              <img 
                src={profile?.photo_url || `https://ui-avatars.com/api/?name=User`} 
                className="w-full h-full rounded-full object-cover border-4 border-dark-600"
              />
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? <Loader2 className="animate-spin text-white" /> : <Camera className="text-white" />}
              </div>
              <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
            </div>
            <p className="text-sm text-gray-500">JPG/PNG até 5MB</p>
          </div>

          <div className="bg-dark-900/50 p-4 rounded-xl border border-dark-700 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${profile?.is_public ? 'bg-green-500/20 text-green-500' : 'bg-gray-700 text-gray-400'}`}>
                    {profile?.is_public ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </div>
                <div>
                    <h3 className="text-white font-bold">Visibilidade</h3>
                    <p className="text-xs text-gray-500">{profile?.is_public ? 'Visível no Explorar' : 'Oculto (Ghost Mode)'}</p>
                </div>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={!!profile?.is_public} 
                    onChange={(e) => setProfile({...profile, is_public: e.target.checked})} 
                    className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
             </label>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nome Artístico</label>
              <input
                type="text"
                value={profile?.bio_name || ''}
                onChange={(e) => setProfile({ ...profile, bio_name: e.target.value })}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg p-3 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Preço/Minuto (R$)</label>
              <input
                type="number"
                value={profile?.price_per_minute || ''}
                onChange={(e) => setProfile({ ...profile, price_per_minute: parseFloat(e.target.value) })}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg p-3 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Bio</label>
            <textarea
              value={profile?.bio_description || ''}
              onChange={(e) => setProfile({ ...profile, bio_description: e.target.value })}
              className="w-full h-32 bg-dark-900 border border-dark-700 rounded-lg p-3 text-white"
            />
          </div>

          <button type="submit" disabled={saving} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl flex justify-center gap-2">
            <Save className="h-5 w-5" /> Salvar
          </button>
        </form>
      </div>
    </div>
  );
}
