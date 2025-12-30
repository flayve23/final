import { useEffect, useState } from 'react';
import api from '../../services/api.ts';
import { Loader2, DollarSign, Save } from 'lucide-react';

export default function AdminCommission() {
  const [streamers, setStreamers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newRate, setNewRate] = useState('');

  useEffect(() => {
    fetchStreamers();
  }, []);

  const fetchStreamers = async () => {
    try {
      const { data } = await api.get('/profiles'); // Reusando rota pública que lista streamers
      // Em produção, criaríamos uma rota admin específica que retorna TODOS (incluindo offline)
      // e inclui o campo `custom_commission_rate` que a rota pública esconde.
      // Para este MVP, vamos assumir que a rota pública serve, mas precisamos buscar o rate via endpoint admin individual ou melhorar a lista.
      
      // Vamos buscar o rate individualmente para quem estamos editando ou criar endpoint de lista admin melhorada.
      // Solução rápida: Listar e permitir setar. O valor atual não será visível na lista pública, mas o update funciona.
      setStreamers(data);
    } catch (error) {
      console.error('Erro', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRate = async (userId: number) => {
    try {
      const rateDecimal = parseFloat(newRate) / 100; // Converte 20% para 0.20
      await api.post('/admin/users/commission', { user_id: userId, rate: rateDecimal });
      alert('Taxa atualizada!');
      setEditingId(null);
      setNewRate('');
    } catch (error) {
      alert('Erro ao atualizar taxa');
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <DollarSign className="h-6 w-6 text-green-500" /> Gestão de Comissões
      </h1>
      
      <div className="bg-dark-800 p-6 rounded-xl border border-dark-700">
        <h3 className="text-lg font-bold text-white mb-2">Taxa Padrão Global: 30%</h3>
        <p className="text-gray-400 text-sm">Esta taxa se aplica a todos os usuários que não possuem taxa personalizada definida abaixo.</p>
      </div>

      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-dark-900/50 text-gray-400">
            <tr>
              <th className="p-4 font-medium">Streamer</th>
              <th className="p-4 font-medium">Avaliação</th>
              <th className="p-4 font-medium text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {streamers.map((s) => (
              <tr key={s.id} className="hover:bg-dark-700/50">
                <td className="p-4 flex items-center gap-3">
                  <img src={s.photo_url} className="w-8 h-8 rounded-full bg-dark-600" />
                  <span className="text-white font-medium">{s.username}</span>
                </td>
                <td className="p-4 text-yellow-400 font-bold">★ {s.average_rating}</td>
                <td className="p-4 text-right">
                  {editingId === s.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <input 
                        type="number" 
                        value={newRate}
                        onChange={(e) => setNewRate(e.target.value)}
                        placeholder="%"
                        className="w-16 bg-dark-900 border border-dark-600 rounded px-2 py-1 text-white text-right"
                      />
                      <span className="text-gray-400">%</span>
                      <button onClick={() => handleUpdateRate(s.id)} className="p-1 bg-green-600 rounded hover:bg-green-500 text-white">
                        <Save className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { setEditingId(s.id); setNewRate(''); }}
                      className="text-primary-400 hover:text-primary-300 text-xs font-bold uppercase"
                    >
                      Negociar Taxa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
