import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function ViewerWallet() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/viewer/browse')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h1 className="text-2xl font-bold text-white mb-6">Minha Carteira</h1>
          <p className="text-gray-300">Saldo: R$ 0,00</p>
        </div>
      </div>
    </div>
  );
}
