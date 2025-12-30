import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Video, Mail, Lock, User, Loader2, AlertTriangle } from 'lucide-react';
import api from '../../services/api.ts';

export default function Signup() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'viewer' // 'viewer' | 'streamer'
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return alert('Senhas não conferem');
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      
      login(data.token, data.user);
    } catch (error: any) {
      console.error(error);
      // DEBUG MODE: Show exact error
      const serverError = error.response?.data?.error || error.response?.data?.message || error.message;
      alert(`ERRO TÉCNICO: ${serverError}\n\nCódigo: ${error.response?.status}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="bg-dark-900/80 backdrop-blur-xl w-full max-w-md p-8 rounded-3xl border border-white/10 shadow-2xl z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-tr from-primary-600 to-purple-600 p-3 rounded-2xl shadow-lg shadow-primary-900/20">
              <Video className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Crie sua Conta</h2>
          <p className="text-gray-400">Junte-se à plataforma mais exclusiva.</p>
        </div>

        <div className="flex bg-dark-800 p-1 rounded-xl mb-6 border border-dark-700">
          <button
            type="button"
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              formData.role === 'viewer' 
                ? 'bg-dark-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setFormData({ ...formData, role: 'viewer' })}
          >
            Espectador
          </button>
          <button
            type="button"
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              formData.role === 'streamer' 
                ? 'bg-primary-600 text-white shadow-md shadow-primary-900/20' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setFormData({ ...formData, role: 'streamer' })}
          >
            Criador(a)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="text"
              placeholder="Nome de usuário"
              required
              className="w-full bg-dark-800 border border-dark-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>

          <div className="relative group">
            <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="email"
              placeholder="Seu melhor e-mail"
              required
              className="w-full bg-dark-800 border border-dark-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="password"
              placeholder="Senha segura"
              required
              className="w-full bg-dark-800 border border-dark-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="password"
              placeholder="Confirme a senha"
              required
              className="w-full bg-dark-800 border border-dark-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
          </div>

          <div className="text-xs text-gray-500 px-1">
            Ao criar conta, você concorda que tem <span className="font-bold text-white">+18 anos</span>.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3.5 rounded-xl transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Criar Acesso Imediato'}
          </button>
        </form>

        <p className="text-center mt-8 text-gray-500">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-bold transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
