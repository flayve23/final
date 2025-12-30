import { useState, useRef } from 'react';
import api from '../../services/api.ts';
import { Loader2, Upload, Camera } from 'lucide-react';

interface ImageUploadProps {
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  type?: 'profile' | 'story' | 'kyc';
  label?: string;
  className?: string;
}

export default function ImageUpload({ currentUrl, onUpload, type = 'profile', label, className }: ImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação básica
    if (file.size > 5 * 1024 * 1024) { // 5MB
      alert('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Apenas imagens são permitidas.');
      return;
    }

    setLoading(true);
    try {
      // 1. Pedir permissão ao backend (gera Presigned/Proxy URL)
      const { data } = await api.post('/storage/presigned', {
        filename: file.name,
        contentType: file.type,
        type
      });

      // 2. Enviar arquivo para a URL recebida
      // Nota: No nosso backend simulado, usamos PUT para /api/storage/upload?key=...
      // O 'uploadUrl' retornado já contém os parametros necessários.
      // Se fosse AWS S3, seria um PUT direto na URL assinada.
      
      const uploadRes = await fetch(data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      if (!uploadRes.ok) throw new Error('Falha no upload');

      // 3. Notificar pai com a URL pública
      onUpload(data.publicUrl);

    } catch (error) {
      console.error('Upload error:', error);
      alert('Erro ao enviar imagem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>}
      
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer group overflow-hidden border-2 border-dashed border-dark-600 rounded-xl bg-dark-800 hover:border-primary-500 hover:bg-dark-700/50 transition-all ${currentUrl ? 'h-full' : 'h-40 flex flex-col items-center justify-center'}`}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden" 
        />

        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <Loader2 className="animate-spin text-primary-500 h-8 w-8" />
          </div>
        ) : null}

        {currentUrl ? (
          <>
            <img src={currentUrl} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="text-white h-8 w-8" />
            </div>
          </>
        ) : (
          <div className="text-center p-4">
            <Upload className="h-8 w-8 text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Clique para enviar</p>
            <p className="text-xs text-gray-600 mt-1">JPG, PNG (Max 5MB)</p>
          </div>
        )}
      </div>
    </div>
  );
}
