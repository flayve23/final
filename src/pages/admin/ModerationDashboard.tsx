import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export default function ModerationDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-yellow-500" />
          <h1 className="text-3xl font-bold text-white">Moderação de Conteúdo</h1>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-yellow-500/20 p-6 rounded-xl border border-yellow-500/30">
            <div className="text-3xl font-bold text-white mb-2">0</div>
            <div className="text-gray-300 text-sm">Denúncias Pendentes</div>
          </div>
          <div className="bg-green-500/20 p-6 rounded-xl border border-green-500/30">
            <div className="text-3xl font-bold text-white mb-2">0</div>
            <div className="text-gray-300 text-sm">Resolvidas</div>
          </div>
          <div className="bg-red-500/20 p-6 rounded-xl border border-red-500/30">
            <div className="text-3xl font-bold text-white mb-2">0</div>
            <div className="text-gray-300 text-sm">Usuários Banidos</div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-6">Denúncias Recentes</h2>
          <div className="text-center py-12 text-gray-400">
            Nenhuma denúncia pendente
          </div>
        </div>
      </div>
    </div>
  );
}
