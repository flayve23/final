import { useEffect, useState } from 'react';
import { Shield, Search, Filter, Download } from 'lucide-react';
import api from '../../services/api';

interface AuditLog {
  id: number;
  admin_id: number;
  admin_username?: string;
  action: string;
  target_user_id?: number;
  target_username?: string;
  details: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, [filterAction]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/audit-logs', {
        params: { action: filterAction !== 'all' ? filterAction : undefined }
      });
      setLogs(response.data || []);
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      ban_user: 'bg-red-500/20 text-red-500',
      update_role: 'bg-blue-500/20 text-blue-500',
      approve_kyc: 'bg-green-500/20 text-green-500',
      reject_kyc: 'bg-red-500/20 text-red-500',
      update_commission: 'bg-yellow-500/20 text-yellow-500'
    };

    const labels: Record<string, string> = {
      ban_user: 'Banimento',
      update_role: 'Alteração de Role',
      approve_kyc: 'KYC Aprovado',
      reject_kyc: 'KYC Rejeitado',
      update_commission: 'Comissão Alterada'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[action] || 'bg-gray-500/20 text-gray-500'}`}>
        {labels[action] || action}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredLogs = logs.filter(log => {
    if (!search) return true;
    return (
      log.admin_username?.toLowerCase().includes(search.toLowerCase()) ||
      log.target_username?.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase())
    );
  });

  const exportCSV = () => {
    const headers = ['Data', 'Admin', 'Ação', 'Usuário Afetado', 'Detalhes'];
    const rows = filteredLogs.map(log => [
      formatDate(log.created_at),
      log.admin_username || `ID: ${log.admin_id}`,
      log.action,
      log.target_username || `ID: ${log.target_user_id}`,
      log.details
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="text-primary-500" />
          Logs de Auditoria
        </h1>
        <button
          onClick={exportCSV}
          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Busca */}
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por admin, usuário ou ação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white outline-none focus:border-primary-500"
            />
          </div>

          {/* Filtro de Ação */}
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 w-4 h-4" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-dark-700 border border-dark-600 rounded-lg text-white px-4 py-2 outline-none focus:border-primary-500"
            >
              <option value="all">Todas as Ações</option>
              <option value="ban_user">Banimentos</option>
              <option value="update_role">Alterações de Role</option>
              <option value="approve_kyc">KYC Aprovado</option>
              <option value="reject_kyc">KYC Rejeitado</option>
              <option value="update_commission">Comissões</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Logs */}
      <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Carregando logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Nenhum log encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-900 border-b border-dark-700">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase">Data</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase">Admin</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase">Ação</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase">Usuário Afetado</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-dark-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">
                        {log.admin_username || `ID: ${log.admin_id}`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white">
                        {log.target_username || `ID: ${log.target_user_id || 'N/A'}`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <details className="text-sm text-gray-400">
                        <summary className="cursor-pointer hover:text-white">Ver detalhes</summary>
                        <pre className="mt-2 bg-dark-900 p-3 rounded-lg text-xs overflow-auto">
                          {JSON.stringify(JSON.parse(log.details || '{}'), null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-dark-800 p-6 rounded-2xl border border-dark-700">
          <p className="text-sm text-gray-400 mb-1">Total de Logs</p>
          <p className="text-3xl font-bold text-white">{logs.length}</p>
        </div>
        <div className="bg-dark-800 p-6 rounded-2xl border border-dark-700">
          <p className="text-sm text-gray-400 mb-1">Banimentos</p>
          <p className="text-3xl font-bold text-red-500">
            {logs.filter(l => l.action === 'ban_user').length}
          </p>
        </div>
        <div className="bg-dark-800 p-6 rounded-2xl border border-dark-700">
          <p className="text-sm text-gray-400 mb-1">KYCs Aprovados</p>
          <p className="text-3xl font-bold text-green-500">
            {logs.filter(l => l.action === 'approve_kyc').length}
          </p>
        </div>
      </div>
    </div>
  );
}
