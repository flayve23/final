import { useEffect, useState } from 'react';
import { DollarSign, Calendar, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

interface ScheduledPayment {
  id: number;
  streamer_id: number;
  streamer_username: string;
  streamer_email: string;
  amount: number;
  period_start: string;
  period_end: string;
  due_date: string;
  status: string;
  payment_method?: string;
  payment_reference?: string;
  error_message?: string;
  processed_at?: string;
  created_at: string;
}

interface Stats {
  total_paid: { total: number; count: number };
  total_pending: { total: number; count: number };
  upcoming_payments: ScheduledPayment[];
}

export default function PaymentsSchedule() {
  const [payments, setPayments] = useState<ScheduledPayment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, statsRes] = await Promise.all([
        api.get('/payments/scheduled'),
        api.get('/payments/stats')
      ]);
      setPayments(paymentsRes.data.payments || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    const reason = prompt('Motivo do cancelamento:');
    if (!reason) return;

    try {
      await api.post(`/payments/${id}/cancel`, { reason });
      alert('Pagamento cancelado!');
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao cancelar');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-500',
      processing: 'bg-blue-500/20 text-blue-500',
      paid: 'bg-green-500/20 text-green-500',
      failed: 'bg-red-500/20 text-red-500',
      cancelled: 'bg-gray-500/20 text-gray-500'
    };

    const icons: Record<string, any> = {
      pending: Clock,
      processing: AlertTriangle,
      paid: CheckCircle,
      failed: XCircle,
      cancelled: XCircle
    };

    const Icon = icons[status] || Clock;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${colors[status]}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDaysUntilPayment = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Carregando pagamentos...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign className="text-green-500" />
          Agenda de Pagamentos D+30
        </h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-dark-800 p-6 rounded-2xl border border-dark-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Pago</p>
                <p className="text-2xl font-bold text-white">R$ {stats.total_paid.total?.toFixed(2) || '0.00'}</p>
                <p className="text-xs text-gray-500">{stats.total_paid.count || 0} pagamentos</p>
              </div>
            </div>
          </div>

          <div className="bg-dark-800 p-6 rounded-2xl border border-dark-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Pendente</p>
                <p className="text-2xl font-bold text-white">R$ {stats.total_pending.total?.toFixed(2) || '0.00'}</p>
                <p className="text-xs text-gray-500">{stats.total_pending.count || 0} pagamentos</p>
              </div>
            </div>
          </div>

          <div className="bg-dark-800 p-6 rounded-2xl border border-dark-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Próximos 7 Dias</p>
                <p className="text-2xl font-bold text-white">{stats.upcoming_payments.length}</p>
                <p className="text-xs text-gray-500">pagamentos agendados</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Próximos Pagamentos */}
      {stats && stats.upcoming_payments.length > 0 && (
        <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
          <div className="p-4 border-b border-dark-700 bg-dark-900">
            <h3 className="text-lg font-bold text-white">⚡ Próximos Pagamentos (7 dias)</h3>
          </div>
          <div className="divide-y divide-dark-700">
            {stats.upcoming_payments.map((payment) => {
              const daysLeft = getDaysUntilPayment(payment.due_date);
              return (
                <div key={payment.id} className="p-4 hover:bg-dark-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                        daysLeft <= 1 ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'
                      }`}>
                        {daysLeft}d
                      </div>
                      <div>
                        <p className="font-bold text-white">{payment.streamer_username}</p>
                        <p className="text-sm text-gray-400">Vencimento: {formatDate(payment.due_date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-500">R$ {payment.amount.toFixed(2)}</p>
                      {getStatusBadge(payment.status)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista Completa */}
      <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
        <div className="p-4 border-b border-dark-700 bg-dark-900">
          <h3 className="text-lg font-bold text-white">Todos os Pagamentos</h3>
        </div>

        {payments.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Nenhum pagamento agendado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-900 border-b border-dark-700">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase">Streamer</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase">Período</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-gray-400 uppercase">Valor</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-gray-400 uppercase">Vencimento</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-gray-400 uppercase">Status</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-gray-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-dark-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-white">{payment.streamer_username}</p>
                        <p className="text-xs text-gray-400">{payment.streamer_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {formatDate(payment.period_start)} → {formatDate(payment.period_end)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-lg font-bold text-green-500">R$ {payment.amount.toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="text-white">{formatDate(payment.due_date)}</p>
                      <p className="text-xs text-gray-500">{getDaysUntilPayment(payment.due_date)} dias</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(payment.status)}
                      {payment.error_message && (
                        <p className="text-xs text-red-400 mt-1">{payment.error_message}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {payment.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(payment.id)}
                          className="text-red-500 hover:text-red-400 text-sm font-bold"
                        >
                          Cancelar
                        </button>
                      )}
                      {payment.payment_reference && (
                        <p className="text-xs text-gray-500 font-mono">{payment.payment_reference}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info sobre o Cron */}
      <div className="bg-blue-500/10 border border-blue-500/50 p-4 rounded-xl">
        <p className="text-blue-400 text-sm">
          <strong>💡 Automação:</strong> Os pagamentos são processados automaticamente todos os dias à meia-noite (00:00 UTC) 
          pelo Cloudflare Workers Cron Job. Ganhos com mais de 30 dias são pagos via PIX automaticamente.
        </p>
      </div>
    </div>
  );
}
