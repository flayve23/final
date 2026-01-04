import { useEffect, useState } from 'react';
import { AlertTriangle, Eye, CheckCircle, XCircle, Clock, DollarSign, Search, Filter } from 'lucide-react';
import api from '../../services/api';

interface Chargeback {
  id: number;
  payment_id: string;
  viewer_username: string;
  viewer_email: string;
  streamer_username: string;
  amount: number;
  reason: string;
  status: string;
  duration_seconds: number;
  call_date: string;
  created_at: string;
  admin_decision?: string;
  admin_notes?: string;
}

export default function ChargebacksPanel() {
  const [chargebacks, setChargebacks] = useState<Chargeback[]>([]);
  const [selectedChargeback, setSelectedChargeback] = useState<Chargeback | null>(null);
  const [viewerHistory, setViewerHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchChargebacks();
  }, [filter]);

  const fetchChargebacks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/chargebacks/list', {
        params: { status: filter }
      });
      setChargebacks(response.data.chargebacks || []);
    } catch (error) {
      console.error('Erro ao buscar chargebacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChargebackDetails = async (id: number) => {
    try {
      const response = await api.get(`/chargebacks/${id}`);
      setSelectedChargeback(response.data.chargeback);
      setViewerHistory(response.data.viewer_history || []);
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error);
    }
  };

  const handleDecision = async (decision: 'refund' | 'keep' | 'partial') => {
    if (!selectedChargeback) return;

    const notes = prompt(
      `Observações sobre a decisão de ${decision === 'refund' ? 'ESTORNAR' : decision === 'keep' ? 'MANTER' : 'ESTORNO PARCIAL'}:`
    );

    if (notes === null) return; // Cancelou

    setProcessing(true);
    try {
      await api.post(`/chargebacks/${selectedChargeback.id}/decision`, {
        decision,
        notes
      });

      alert(`Decisão registrada: ${decision.toUpperCase()}`);
      setSelectedChargeback(null);
      fetchChargebacks();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao processar decisão');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-500',
      investigating: 'bg-blue-500/20 text-blue-500',
      accepted: 'bg-green-500/20 text-green-500',
      rejected: 'bg-red-500/20 text-red-500',
      resolved: 'bg-gray-500/20 text-gray-500'
    };

    const labels: Record<string, string> = {
      pending: 'Pendente',
      investigating: 'Analisando',
      accepted: 'Estornado',
      rejected: 'Recusado',
      resolved: 'Resolvido'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[status]}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="text-red-500" />
          Gestão de Chargebacks
        </h1>
      </div>

      {/* Filtros */}
      <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700">
        <div className="flex items-center gap-2">
          <Filter className="text-gray-400 w-4 h-4" />
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all' ? 'bg-primary-500 text-white' : 'bg-dark-700 text-gray-400'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-dark-700 text-gray-400'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setFilter('investigating')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'investigating' ? 'bg-blue-500 text-white' : 'bg-dark-700 text-gray-400'
            }`}
          >
            Analisando
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'resolved' ? 'bg-green-500 text-white' : 'bg-dark-700 text-gray-400'
            }`}
          >
            Resolvidos
          </button>
        </div>
      </div>

      {/* Lista de Chargebacks */}
      <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Carregando chargebacks...</p>
          </div>
        ) : chargebacks.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-400">Nenhum chargeback encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-700">
            {chargebacks.map((cb) => (
              <div
                key={cb.id}
                className="p-6 hover:bg-dark-700/50 transition-colors cursor-pointer"
                onClick={() => fetchChargebackDetails(cb.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(cb.status)}
                      <span className="text-2xl font-bold text-red-500">R$ {cb.amount.toFixed(2)}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      <span className="font-bold text-white">{cb.viewer_username}</span>
                      {' vs '}
                      <span className="font-bold text-primary-500">{cb.streamer_username}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Chamada: {formatDuration(cb.duration_seconds)} • {formatDate(cb.call_date)}
                    </div>
                    <p className="text-sm text-gray-400">Motivo: {cb.reason}</p>
                  </div>

                  <div className="text-right space-y-2">
                    <p className="text-xs text-gray-500">{formatDate(cb.created_at)}</p>
                    <button className="flex items-center gap-2 text-primary-500 hover:text-primary-400 text-sm font-bold">
                      <Eye className="w-4 h-4" /> Ver Detalhes
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedChargeback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-dark-800 w-full max-w-4xl rounded-2xl border border-dark-700 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-dark-700 bg-dark-900">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Análise de Chargeback #{selectedChargeback.id}</h3>
                <button
                  onClick={() => setSelectedChargeback(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-6">
              {/* Informações Principais */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-lg font-bold text-white">Informações da Disputa</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Valor em Disputa:</span>
                      <span className="font-bold text-red-500">R$ {selectedChargeback.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      {getStatusBadge(selectedChargeback.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Data da Disputa:</span>
                      <span className="text-white">{formatDate(selectedChargeback.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Payment ID:</span>
                      <span className="text-white font-mono text-xs">{selectedChargeback.payment_id}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-lg font-bold text-white">Dados da Sessão</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Viewer:</span>
                      <span className="text-white">{selectedChargeback.viewer_username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white text-xs">{selectedChargeback.viewer_email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Streamer:</span>
                      <span className="text-primary-500">{selectedChargeback.streamer_username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Duração:</span>
                      <span className="text-white">{formatDuration(selectedChargeback.duration_seconds)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Data da Chamada:</span>
                      <span className="text-white">{formatDate(selectedChargeback.call_date)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Motivo */}
              <div>
                <h4 className="text-lg font-bold text-white mb-2">Motivo da Disputa</h4>
                <p className="bg-dark-900 p-4 rounded-lg text-gray-300">{selectedChargeback.reason}</p>
              </div>

              {/* Histórico do Viewer */}
              <div>
                <h4 className="text-lg font-bold text-white mb-2">Histórico do Viewer (Últimos 30 dias)</h4>
                <div className="bg-dark-900 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-dark-800">
                      <tr>
                        <th className="text-left p-3 text-gray-400">Data</th>
                        <th className="text-left p-3 text-gray-400">Tipo</th>
                        <th className="text-right p-3 text-gray-400">Valor</th>
                        <th className="text-right p-3 text-gray-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700">
                      {viewerHistory.map((tx, i) => (
                        <tr key={i}>
                          <td className="p-3 text-gray-400">{formatDate(tx.created_at)}</td>
                          <td className="p-3 text-white">{tx.type}</td>
                          <td className="p-3 text-right text-white">R$ {tx.amount.toFixed(2)}</td>
                          <td className="p-3 text-right">
                            <span className={`px-2 py-1 rounded text-xs ${
                              tx.status === 'completed' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Decisão */}
              {selectedChargeback.status === 'pending' && (
                <div className="border-t border-dark-700 pt-6">
                  <h4 className="text-lg font-bold text-white mb-4">Tomar Decisão</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => handleDecision('refund')}
                      disabled={processing}
                      className="bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" /> Estornar
                    </button>
                    <button
                      onClick={() => handleDecision('partial')}
                      disabled={processing}
                      className="bg-yellow-600 hover:bg-yellow-500 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <DollarSign className="w-5 h-5" /> Parcial
                    </button>
                    <button
                      onClick={() => handleDecision('keep')}
                      disabled={processing}
                      className="bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" /> Manter
                    </button>
                  </div>
                </div>
              )}

              {/* Decisão Tomada */}
              {selectedChargeback.admin_decision && (
                <div className="bg-blue-500/10 border border-blue-500/50 p-4 rounded-xl">
                  <p className="text-blue-400 font-bold mb-2">
                    Decisão: {selectedChargeback.admin_decision.toUpperCase()}
                  </p>
                  <p className="text-gray-300 text-sm">{selectedChargeback.admin_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
