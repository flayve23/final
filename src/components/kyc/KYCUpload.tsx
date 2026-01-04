import { useState, useRef } from 'react';
import { Camera, Upload, Loader2, CheckCircle, X, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

interface KYCUploadProps {
  onSuccess?: () => void;
}

export default function KYCUpload({ onSuccess }: KYCUploadProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    full_name: '',
    cpf: '',
    birth_date: ''
  });

  const [documentFront, setDocumentFront] = useState<string | null>(null);
  const [documentBack, setDocumentBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Arquivo muito grande! Máximo 5MB.');
      return;
    }

    // Converter para base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const validateAge = () => {
    if (!formData.birth_date) return false;
    
    const birthYear = new Date(formData.birth_date).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    
    return age >= 18;
  };

  const handleSubmit = async () => {
    // Validações
    if (!formData.full_name || !formData.cpf || !formData.birth_date) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    if (!validateAge()) {
      setError('Você precisa ter 18 anos ou mais para usar a plataforma');
      return;
    }

    if (!documentFront || !documentBack || !selfie) {
      setError('Envie todos os documentos solicitados');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/kyc/submit', {
        ...formData,
        document_front: documentFront,
        document_back: documentBack,
        selfie: selfie
      });

      if (response.data.success) {
        setStep(4); // Sucesso
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao enviar documentos');
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  if (step === 4) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-dark-800 rounded-2xl border border-dark-700 text-center space-y-6">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-white">Documentos Enviados!</h2>
        <p className="text-gray-400">
          Sua verificação está em análise. Você receberá uma notificação quando for aprovada.
          <br />
          <span className="text-sm">Prazo médio: 24-48 horas</span>
        </p>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="bg-primary-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-600 transition-colors"
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-dark-800 p-6 rounded-2xl border border-dark-700">
        <h1 className="text-2xl font-bold text-white mb-2">Verificação de Identidade</h1>
        <p className="text-gray-400 text-sm">
          Para sua segurança e compliance, precisamos verificar sua identidade.
        </p>
        
        {/* Progress */}
        <div className="flex items-center gap-2 mt-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full transition-colors ${
                step >= s ? 'bg-primary-500' : 'bg-dark-700'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Dados</span>
          <span>Documentos</span>
          <span>Selfie</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Step 1: Dados Pessoais */}
      {step === 1 && (
        <div className="bg-dark-800 p-8 rounded-2xl border border-dark-700 space-y-6">
          <h3 className="text-xl font-bold text-white">Dados Pessoais</h3>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">Nome Completo *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full bg-dark-700 text-white px-4 py-3 rounded-xl border border-dark-600 focus:border-primary-500 outline-none"
              placeholder="Como está no documento"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">CPF *</label>
            <input
              type="text"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
              maxLength={14}
              className="w-full bg-dark-700 text-white px-4 py-3 rounded-xl border border-dark-600 focus:border-primary-500 outline-none"
              placeholder="000.000.000-00"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Data de Nascimento * (18+)</label>
            <input
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              className="w-full bg-dark-700 text-white px-4 py-3 rounded-xl border border-dark-600 focus:border-primary-500 outline-none"
            />
            {formData.birth_date && !validateAge() && (
              <p className="text-red-400 text-sm mt-2">⚠️ Você precisa ter 18 anos ou mais</p>
            )}
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!formData.full_name || !formData.cpf || !formData.birth_date || !validateAge()}
            className="w-full bg-primary-500 text-white py-3 rounded-xl font-bold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuar
          </button>
        </div>
      )}

      {/* Step 2: Documentos */}
      {step === 2 && (
        <div className="bg-dark-800 p-8 rounded-2xl border border-dark-700 space-y-6">
          <h3 className="text-xl font-bold text-white">Documentos com Foto</h3>
          <p className="text-gray-400 text-sm">RG, CNH ou Passaporte</p>

          {/* Frente */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Frente do Documento *</label>
            <input
              ref={frontInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, setDocumentFront)}
              className="hidden"
            />
            <button
              onClick={() => frontInputRef.current?.click()}
              className="w-full border-2 border-dashed border-dark-600 rounded-xl p-8 hover:border-primary-500 transition-colors"
            >
              {documentFront ? (
                <div className="space-y-2">
                  <img src={documentFront} alt="Preview" className="w-full max-h-40 object-contain rounded" />
                  <p className="text-green-500 flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Enviado
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Upload className="w-8 h-8" />
                  <span>Clique para enviar a frente</span>
                </div>
              )}
            </button>
          </div>

          {/* Verso */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Verso do Documento *</label>
            <input
              ref={backInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, setDocumentBack)}
              className="hidden"
            />
            <button
              onClick={() => backInputRef.current?.click()}
              className="w-full border-2 border-dashed border-dark-600 rounded-xl p-8 hover:border-primary-500 transition-colors"
            >
              {documentBack ? (
                <div className="space-y-2">
                  <img src={documentBack} alt="Preview" className="w-full max-h-40 object-contain rounded" />
                  <p className="text-green-500 flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Enviado
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Upload className="w-8 h-8" />
                  <span>Clique para enviar o verso</span>
                </div>
              )}
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-dark-700 text-white py-3 rounded-xl font-bold hover:bg-dark-600 transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!documentFront || !documentBack}
              className="flex-1 bg-primary-500 text-white py-3 rounded-xl font-bold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Selfie */}
      {step === 3 && (
        <div className="bg-dark-800 p-8 rounded-2xl border border-dark-700 space-y-6">
          <h3 className="text-xl font-bold text-white">Selfie de Verificação</h3>
          <p className="text-gray-400 text-sm">
            Tire uma selfie segurando seu documento ao lado do rosto
          </p>

          <div>
            <input
              ref={selfieInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={(e) => handleFileChange(e, setSelfie)}
              className="hidden"
            />
            <button
              onClick={() => selfieInputRef.current?.click()}
              className="w-full border-2 border-dashed border-dark-600 rounded-xl p-8 hover:border-primary-500 transition-colors"
            >
              {selfie ? (
                <div className="space-y-2">
                  <img src={selfie} alt="Preview" className="w-full max-h-60 object-contain rounded" />
                  <p className="text-green-500 flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Selfie capturada
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Camera className="w-12 h-12" />
                  <span className="font-bold">Tirar Selfie</span>
                  <span className="text-xs">Segure seu documento ao lado do rosto</span>
                </div>
              )}
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 bg-dark-700 text-white py-3 rounded-xl font-bold hover:bg-dark-600 transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selfie || loading}
              className="flex-1 bg-primary-500 text-white py-3 rounded-xl font-bold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Documentos'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
