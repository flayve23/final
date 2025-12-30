import { useState, useEffect } from 'react';
import api from '../../services/api.ts';
import { Loader2, ShieldCheck, AlertTriangle, Upload, FileText } from 'lucide-react';

export default function KYCPage() {
  const [status, setStatus] = useState('loading');
  const [formData, setFormData] = useState({ full_name: '', cpf: '', birth_date: '' });
  const [docFront, setDocFront] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const { data } = await api.get('/streamer/kyc');
      setStatus(data.status || 'not_submitted');
    } catch (e) { setStatus('not_submitted'); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    const file = e.target.files[0];
    const data = new FormData();
    data.append('file', file);
    
    try {
        const res = await api.post('/storage/upload/kyc', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        setDocFront(res.data.url); // Saves the URL to state
    } catch(e) { alert('Erro no upload'); }
    finally { setUploading(false); }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFront) return alert('Envie a foto do documento');

    try {
      await api.post('/streamer/kyc', { ...formData, document_url: docFront });
      setStatus('pending');
    } catch (e) { alert('Erro ao enviar'); }
  };

  if (status === 'loading') return <div className="p-8"><Loader2 className="animate-spin" /></div>;

  if (status === 'pending') return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl text-center">
      <Loader2 className="h-12 w-12 text-yellow-500 mx-auto mb-4 animate-spin" />
      <h2 className="text-xl font-bold text-white mb-2">Verificação em Análise</h2>
      <p className="text-gray-400">Nossa equipe está analisando seus documentos. Isso leva até 24h.</p>
    </div>
  );

  if (status === 'approved') return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-green-500/10 border border-green-500/30 rounded-2xl text-center">
      <ShieldCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">Conta Verificada</h2>
      <p className="text-gray-400">Você já pode realizar saques e receber chamadas sem limites.</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Verificação de Identidade (KYC)</h1>
      <div className="bg-dark-800 p-8 rounded-2xl border border-dark-700">
        <div className="mb-6 flex gap-3 p-4 bg-blue-500/10 rounded-xl text-blue-400 text-sm">
            <ShieldCheck className="h-5 w-5 flex-shrink-0" />
            <p>Seus dados são criptografados e usados apenas para verificação legal. Nunca serão exibidos no perfil.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
             <div>
                <label className="block text-sm text-gray-400 mb-1">Nome Completo</label>
                <input required className="w-full bg-dark-900 border border-dark-700 rounded-lg p-3 text-white" 
                    value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
             </div>
             <div>
                <label className="block text-sm text-gray-400 mb-1">CPF</label>
                <input required className="w-full bg-dark-900 border border-dark-700 rounded-lg p-3 text-white" 
                    value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} />
             </div>
          </div>

          <div>
             <label className="block text-sm text-gray-400 mb-2">Foto do Documento (Frente)</label>
             <div className="border-2 border-dashed border-dark-600 rounded-xl p-8 text-center hover:border-primary-500 transition-colors cursor-pointer relative">
                <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                {uploading ? (
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-500" />
                ) : docFront ? (
                    <div className="text-green-500 flex flex-col items-center">
                        <FileText className="h-8 w-8 mb-2" />
                        <span className="font-bold">Documento Carregado</span>
                    </div>
                ) : (
                    <div className="text-gray-500">
                        <Upload className="mx-auto h-8 w-8 mb-2" />
                        <span>Clique para enviar foto</span>
                    </div>
                )}
             </div>
          </div>

          <button type="submit" className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl">Enviar para Análise</button>
        </form>
      </div>
    </div>
  );
}
