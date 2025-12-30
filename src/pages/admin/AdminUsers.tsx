import { useEffect, useState } from 'react';
import api from '../../services/api.ts';
import { Loader2, Search, UserCog, Shield, Ban, Video } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get(`/admin/users?search=${search}`);
      setUsers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userId: number, newRole: string) => {
    if (!confirm(`Mudar usuário para ${newRole}?`)) return;
    try {
      await api.post('/admin/users/update-role', { user_id: userId, new_role: newRole });
      fetchUsers();
    } catch (e) { alert('Erro ao atualizar'); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <UserCog className="h-6 w-6 text-primary-500" /> Gestão de Usuários
      </h1>

      <div className="relative">
        <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
        <input 
          type="text" 
          placeholder="Buscar por email ou nome..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-white outline-none focus:border-primary-500"
        />
      </div>

      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-dark-900/50 text-gray-400">
              <tr>
                <th className="p-4">Usuário</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role Atual</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-dark-700/50">
                  <td className="p-4 font-medium text-white">{u.username}</td>
                  <td className="p-4 text-gray-400">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                      u.role === 'streamer' ? 'bg-primary-500/20 text-primary-400' :
                      u.role === 'banned' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <button onClick={() => updateRole(u.id, 'streamer')} className="p-2 hover:bg-white/10 rounded" title="Virar Streamer"><Video className="h-4 w-4 text-primary-400"/></button>
                    <button onClick={() => updateRole(u.id, 'admin')} className="p-2 hover:bg-white/10 rounded" title="Virar Admin"><Shield className="h-4 w-4 text-purple-400"/></button>
                    <button onClick={() => updateRole(u.id, 'banned')} className="p-2 hover:bg-red-900/20 rounded" title="Banir"><Ban className="h-4 w-4 text-red-500"/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
