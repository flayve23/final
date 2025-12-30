import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api.ts';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.token, data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
      <div className="max-w-md w-full bg-dark-800 rounded-xl border border-dark-700 shadow-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Bem-vindo de volta</h2>
          <p className="text-gray-400">Entre para continuar no Flayve</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-400">Senha</label>
              <Link to="/forgot-password" className="text-xs text-primary-400 hover:text-primary-300">
                Esqueceu a senha?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Entrar'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400">
          Não tem uma conta?{' '}
          <Link to="/signup" className="text-primary-400 hover:text-primary-300 font-medium">
            Cadastre-se grátis
          </Link>
        </p>
      </div>
    </div>
  );
}
