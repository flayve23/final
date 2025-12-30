import { useEffect, useState } from 'react';
import api from '../../services/api.ts';
import { Wallet, History, ArrowUpRight, ArrowDownLeft, Plus, CreditCard, ShieldCheck } from 'lucide-react';
import RechargeModal from '../../components/ui/RechargeModal';

export default function ViewerWallet() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [customAmount, setCustomAmount] = useState(''); // Estado para o input direto

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const balRes = await api.get('/wallet/balance');
      setBalance(balRes.data.balance);
      const txRes = await api.get('/wallet/transactions');
      setTransactions(txRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRecharge = async (value: number) => {
    if (!confirm(`Confirmar recarga simulada de R$ ${value}?`)) return;
    try {
      await api.post('/wallet/recharge', { amount: value, method: 'pix', cpf: '00000000000' });
      alert('Recarga realizada!');
      fetchWallet();
    } catch (e) { alert('Erro na recarga'); }
  };

  const handleCustomRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(customAmount);
    if (!value || value < 5) return alert('Mínimo R$ 5,00');
    handleQuickRecharge(value);
    setCustomAmount('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Wallet className="text-primary-500" /> Minha Carteira
        </h1>
      </div>

      {/* Cartão de Saldo e Recarga Rápida */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Lado Esquerdo: Saldo */}
        <div className="bg-gradient-to-br from-primary-900/50 to-dark-900 p-8 rounded-3xl border border-primary-500/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
            <Wallet className="w-32 h-32 text-white" />
          </div>
          <p className="text-primary-200 font-medium mb-2">Saldo Atual</p>
          <h2 className="text-5xl font-black text-white mb-6">R$ {balance.toFixed(2)}</h2>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-white text-primary-900 px-6 py-3 rounded-xl font-bold hover:bg-primary-50 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Opções de Recarga
          </button>
        </div>

        {/* Lado Direito: Input Direto (A Correção Solicitada) */}
        <div className="bg-dark-800 p-8 rounded-3xl border border-dark-700 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-white mb-4">Recarga Rápida</h3>
          
          <form onSubmit={handleCustomRecharge} className="space-y-4">
            <div>
                <label className="text-xs text-gray-400 mb-1 block">Digite o valor que quiser:</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                    <input 
                        type="number" 
                        step="0.01"
                        min="5"
                        placeholder="0,00"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-600 rounded-xl py-4 pl-12 pr-4 text-xl text-white font-bold focus:border-primary-500 outline-none transition-colors"
                    />
                </div>
            </div>
            <button 
                type="submit"
                disabled={!customAmount}
                className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
                <CreditCard className="w-5 h-5" /> Pagar Agora
            </button>
          </form>

          <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
             {[20, 50, 100].map(val => (
                 <button 
                    key={val}
                    onClick={() => handleQuickRecharge(val)}
                    className="flex-1 min-w-[80px] py-2 border border-dark-600 rounded-lg text-gray-300 hover:border-primary-500 hover:text-white transition-colors text-sm font-medium"
                 >
                    + R$ {val}
                 </button>
             ))}
          </div>
        </div>
      </div>

      {/* Histórico */}
      <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
        <div className="p-6 border-b border-dark-700 flex items-center gap-2">
          <History className="text-gray-400 w-5 h-5" />
          <h3 className="font-bold text-white">Histórico de Transações</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-dark-900/50 text-gray-400 text-sm">
              <tr>
                <th className="p-4">Data</th>
                <th className="p-4">Tipo</th>
                <th className="p-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {transactions.map((tx: any) => (
                <tr key={tx.id} className="text-sm hover:bg-dark-700/50">
                  <td className="p-4 text-gray-400">
                    {new Date(tx.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4">
                    <span className="flex items-center gap-2 text-white capitalize">
                      {tx.type === 'deposit' ? <ArrowDownLeft className="text-green-500 w-4 h-4" /> : <ArrowUpRight className="text-red-500 w-4 h-4" />}
                      {tx.type === 'deposit' ? 'Recarga' : 'Consumo'}
                    </span>
                  </td>
                  <td className={`p-4 text-right font-bold ${tx.type === 'deposit' ? 'text-green-500' : 'text-red-500'}`}>
                    {tx.type === 'deposit' ? '+' : '-'} R$ {Number(tx.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RechargeModal isOpen={showModal} onClose={() => setShowModal(false)} onSuccess={fetchWallet} />
    </div>
  );
}
