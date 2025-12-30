import { useEffect, useState } from 'react';
import api from '../../services/api.ts';
import { Loader2, DollarSign, Building, History, ArrowDownLeft, ArrowUpRight, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function EarningsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const { data } = await api.get('/streamer/earnings');
      setData(data);
    } catch (error) {
      console.error('Erro ao carregar ganhos', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('Confirmar solicitação de saque?')) return;
    setProcessing(true);
    try {
      await api.post('/streamer/withdraw', {
        amount: parseFloat(withdrawAmount),
        pix_key: 'email_do_cadastro' // Simplificado para MVP
      });
      alert('Saque solicitado! O financeiro irá analisar em até 24h.');
      setWithdrawAmount('');
      fetchEarnings();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao processar.');
    } finally {
      setProcessing(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'call_earning': return { label: 'Chamada de Vídeo', color: 'text-green-400', icon: <ArrowDownLeft className="h-4 w-4" /> };
      case 'tip': return { label: 'Presente (Gorjeta)', color: 'text-green-400', icon: <ArrowDownLeft className="h-4 w-4" /> };
      case 'referral': return { label: 'Indicação', color: 'text-blue-400', icon: <ArrowDownLeft className="h-4 w-4" /> };
      case 'withdrawal': return { label: 'Saque PIX', color: 'text-gray-400', icon: <ArrowUpRight className="h-4 w-4" /> };
      case 'platform_fee': return { label: 'Taxa da Plataforma', color: 'text-gray-500', icon: <Building className="h-4 w-4" /> };
      case 'refund': return { label: 'Reembolso (Estorno)', color: 'text-red-400', icon: <AlertTriangle className="h-4 w-4" /> };
      case 'chargeback': return { label: 'CHARGEBACK (Disputa)', color: 'text-red-600 font-black', icon: <ShieldAlert className="h-4 w-4" /> };
      case 'penalty': return { label: 'Penalidade/Multa', color: 'text-red-500', icon: <AlertTriangle className="h-4 w-4" /> };
      default: return { label: type, color: 'text-gray-400', icon: <DollarSign className="h-4 w-4" /> };
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary-500" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <h1 className="text-2xl font-bold text-white">Gestão Financeira</h1>
        <div className="text-xs text-gray-500">Ciclo D+30</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Painel de Saldo */}
        <div className="bg-gradient-to-br from-dark-800 to-dark-900 p-8 rounded-2xl border border-dark-700 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="h-32 w-32 text-white" />
          </div>
          <p className="text-gray-400 font-medium mb-1 uppercase tracking-wider text-xs">Saldo Líquido Disponível</p>
          <h2 className="text-5xl font-black text-white tracking-tight">R$ {Number(data?.available_balance || 0).toFixed(2)}</h2>
          <div className="mt-6 flex gap-4 text-sm">
            <div>
              <p className="text-gray-500">Lifetime (Bruto)</p>
              <p className="text-gray-300 font-bold">R$ {Number(data?.total_lifetime_earnings || 0).toFixed(2)}</p>
            </div>
            <div className="w-px bg-dark-700 h-10"></div>
            <div>
              <p className="text-gray-500">Retido (D+30)</p>
              <p className="text-gray-300 font-bold">R$ 0,00</p>
            </div>
          </div>
        </div>

        {/* Formulário de Saque */}
        <div className="bg-dark-800 p-8 rounded-2xl border border-dark-700">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Building className="h-5 w-5 text-primary-500" /> Solicitar Transferência
          </h3>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-500 font-bold">R$</span>
              <input
                type="number"
                min="50"
                step="0.01"
                required
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0,00"
                className="w-full pl-10 pr-4 py-3 bg-dark-900 border border-dark-700 rounded-xl text-white focus:ring-2 focus:ring-primary-500 outline-none font-mono text-lg"
              />
            </div>
            <button
              type="submit"
              disabled={processing || !withdrawAmount}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'Solicitar PIX'}
            </button>
            <p className="text-xs text-center text-gray-500">
              Taxa de saque: R$ 0,00 • Processamento em até 1 dia útil.
            </p>
          </form>
        </div>
      </div>

      {/* Extrato Detalhado (Ledger) */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <History className="h-5 w-5 text-gray-400" /> Extrato Detalhado
        </h3>
        
        <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden shadow-lg">
          {data?.ledger?.length === 0 ? (
             <div className="p-12 text-center">
                <div className="bg-dark-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="h-8 w-8 text-gray-500" />
                </div>
                <h4 className="text-white font-bold mb-1">Sem movimentações</h4>\
                <p className="text-gray-500 text-sm">Suas chamadas e saques aparecerão aqui.</p>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-dark-900/80 text-gray-400 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="p-4">Data</th>
                    <th className="p-4">Descrição/Tipo</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {data?.ledger?.map((tx: any) => {
                    const info = getTypeLabel(tx.type);
                    const isDebit = ['withdrawal', 'penalty', 'platform_fee', 'refund', 'chargeback'].includes(tx.type);
                    
                    return (
                      <tr key={tx.id} className="hover:bg-dark-700/30 transition-colors">
                        <td className="p-4 text-gray-400 whitespace-nowrap">
                            {new Date(tx.created_at).toLocaleDateString('pt-BR')} <span className="text-gray-600 text-xs">{new Date(tx.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                        </td>
                        <td className="p-4">
                            <div className={`flex items-center gap-2 font-medium ${info.color}`}>
                                {info.icon} {info.label}
                            </div>
                        </td>
                        <td className="p-4 text-center">
                           <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                             tx.status === 'completed' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                             tx.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                             'bg-red-500/10 border-red-500/20 text-red-500'
                           }`}>
                             {tx.status === 'completed' ? 'Confirmado' : tx.status}
                           </span>
                        </td>
                        <td className={`p-4 text-right font-mono font-bold text-base ${isDebit ? 'text-red-400' : 'text-green-400'}`}>
                           {isDebit ? '-' : '+'} R$ {Number(tx.amount).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
