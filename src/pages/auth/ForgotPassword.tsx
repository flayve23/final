import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.ts';
import { Loader2, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (error) {
      // Mesmo com erro, mostramos sucesso para segurança
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
      <div className="max-w-md w-full bg-dark-800 rounded-xl border border-dark-700 p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Recuperar Senha</h2>
          <p className="text-gray-400">Digite seu email para receber o link.</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <p className="text-white">Se o email estiver cadastrado, você receberá um link em instantes.</p>
            <Link to="/login" className="block w-full py-3 bg-dark-700 text-white rounded-lg mt-4">Voltar para Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-dark-900 border border-dark-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg flex items-center justify-center"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Enviar Link'}
            </button>
          </form>
        )}
        
        {!sent && (
          <p className="mt-6 text-center text-sm">
            <Link to="/login" className="text-gray-400 hover:text-white">Cancelar</Link>
          </p>
        )}
      </div>
    </div>
  );
}
