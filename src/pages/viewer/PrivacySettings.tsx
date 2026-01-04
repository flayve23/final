import { useState, useEffect } from 'react';
import { Shield, UserX, Eye, EyeOff, Settings, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

interface BlockedStreamer {
  id: number;
  streamer_id: number;
  streamer_name: string;
  streamer_photo?: string;
  created_at: string;
}

export default function PrivacySettings() {
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [blockedStreamers, setBlockedStreamers] = useState<BlockedStreamer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Buscar configurações de privacidade
      const settingsRes = await api.get('/profiles/privacy-settings');
      setAnonymousMode(settingsRes.data.anonymous_mode || false);
      
      // Buscar streamers bloqueados
      const blockedRes = await api.get('/profiles/blocked-streamers');
      setBlockedStreamers(blockedRes.data || []);
      
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAnonymous = async () => {
    setSaving(true);
    try {
      await api.post('/profiles/update-privacy', {
        anonymous_mode: !anonymousMode
      });
      setAnonymousMode(!anonymousMode);
      alert('Configuração atualizada!');
    } catch (error) {
      alert('Erro ao atualizar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (streamerId: number) => {
    if (!confirm('Desbloquear este streamer?')) return;

    try {
      await api.post('/profiles/unblock-streamer', { streamer_id: streamerId });
      setBlockedStreamers(blockedStreamers.filter(b => b.streamer_id !== streamerId));
      alert('Streamer desbloqueado!');
    } catch (error) {
      alert('Erro ao desbloquear');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield className="text-primary-500 w-8 h-8" />
        <h1 className="text-2xl font-bold text-white">Privacidade e Segurança</h1>
      </div>

      {/* Modo Anônimo */}
      <div className="bg-dark-800 p-6 rounded-2xl border border-dark-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              anonymousMode ? 'bg-primary-500/20' : 'bg-dark-700'
            }`}>
              {anonymousMode ? <EyeOff className="w-6 h-6 text-primary-500" /> : <Eye className="w-6 h-6 text-gray-400" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Modo Anônimo</h3>
              <p className="text-sm text-gray-400">
                Seu username não será exibido para streamers durante chamadas
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleAnonymous}
            disabled={saving}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              anonymousMode ? 'bg-primary-500' : 'bg-dark-700'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                anonymousMode ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {anonymousMode && (
          <div className="mt-4 bg-blue-500/10 border border-blue-500/50 text-blue-400 p-3 rounded-xl flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Modo anônimo ativado. Você aparecerá como "Viewer Anônimo" nas chamadas.</span>
          </div>
        )}
      </div>

      {/* Streamers Bloqueados */}
      <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
        <div className="p-6 border-b border-dark-700">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <UserX className="w-5 h-5 text-red-500" />
            Streamers Bloqueados ({blockedStreamers.length})
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Você não verá perfis nem receberá notificações destes streamers
          </p>
        </div>

        {blockedStreamers.length === 0 ? (
          <div className="p-12 text-center">
            <UserX className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Você não bloqueou nenhum streamer</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-700">
            {blockedStreamers.map((blocked) => (
              <div key={blocked.id} className="p-4 hover:bg-dark-700/50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={blocked.streamer_photo || '/default-avatar.png'}
                    alt={blocked.streamer_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-bold text-white">{blocked.streamer_name}</p>
                    <p className="text-xs text-gray-400">
                      Bloqueado em {new Date(blocked.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleUnblock(blocked.streamer_id)}
                  className="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-xl font-bold transition-colors"
                >
                  Desbloquear
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Outras Configurações */}
      <div className="bg-dark-800 p-6 rounded-2xl border border-dark-700">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-primary-500" />
          Outras Configurações
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center py-3 border-b border-dark-700">
            <span className="text-gray-300">Notificações de novas mensagens</span>
            <button className="text-primary-500 hover:text-primary-400 font-bold">Gerenciar</button>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-dark-700">
            <span className="text-gray-300">Histórico de navegação</span>
            <button className="text-primary-500 hover:text-primary-400 font-bold">Limpar</button>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-300">Dados da conta</span>
            <button className="text-red-500 hover:text-red-400 font-bold">Excluir Conta</button>
          </div>
        </div>
      </div>

      {/* Informações de Segurança */}
      <div className="bg-blue-500/10 border border-blue-500/50 text-blue-400 p-6 rounded-2xl">
        <p className="text-sm">
          <strong>Dica de Segurança:</strong> Nunca compartilhe seus dados pessoais ou informações de pagamento 
          diretamente com streamers. Todas as transações devem ser feitas pela plataforma.
        </p>
      </div>
    </div>
  );
}
