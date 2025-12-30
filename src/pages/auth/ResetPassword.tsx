import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api.ts';
import { Loader2, Lock } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      alert('Senha alterada com sucesso!');
      navigate('/login');
    } catch (error) {
      alert('Link inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return <div className="text-white text-center p-20">Token inválido.</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
      <div className="max-w-md w-full bg-dark-800 rounded-xl border border-dark-700 p-8">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Nova Senha</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Digite sua nova senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-dark-900 border border-dark-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg flex items-center justify-center"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Salvar Nova Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
