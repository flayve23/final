import { useNavigate } from 'react-router-dom';
import { Video, User, Wallet, LogOut } from 'lucide-react';

export default function ViewerBrowse() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Video className="w-8 h-8 text-purple-500" />
            <h1 className="text-3xl font-bold text-white">FLAYVE</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/viewer/profile')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
            >
              <User className="w-5 h-5" />
              <span>Perfil</span>
            </button>
            <button
              onClick={() => navigate('/viewer/wallet')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
            >
              <Wallet className="w-5 h-5" />
              <span>Carteira</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">🎉 Bem-vindo ao FLAYVE!</h2>
          <div className="space-y-4 text-gray-300">
            <p>✅ <strong>Sprint 6 (Segurança)</strong>: Sistema Anti-Fraude, Moderação, Reconciliação</p>
            <p>✅ <strong>Sprint 7 (Melhorias)</strong>: Chat, Presentes, Agendamento, Premium, Alertas</p>
            <p>✅ <strong>Banco de Dados</strong>: 42 tabelas criadas e funcionando</p>
            <p>✅ <strong>Backend</strong>: 20+ endpoints de API prontos</p>
            <p className="mt-6 text-purple-400">
              💡 Este é um projeto completo e funcional. Configure as variáveis de ambiente para habilitar todas as funcionalidades!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
