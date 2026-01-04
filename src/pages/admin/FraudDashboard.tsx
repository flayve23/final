// src/pages/admin/FraudDashboard.tsx
// Dashboard de Detecção de Fraudes - FLAYVE

import { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Eye,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  Filter
} from 'lucide-react';

// ===========================
// TIPOS
// ===========================

interface FraudFlag {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  flag_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: any;
  auto_generated: boolean;
  reviewed: boolean;
  reviewed_by?: string;
  reviewed_at?: number;
  created_at: number;
}

interface FraudStats {
  total_flags: number;
  unreviewed_flags: number;
  critical_flags: number;
  high_risk_users: number;
  blocked_transactions: number;
  saved_amount: number;
  recent_trends: {
    new_flags_today: number;
    new_flags_week: number;
    trend: 'up' | 'down' | 'stable';
  };
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  status: 'pending_approval' | 'approved' | 'rejected';
  fraud_score: number;
  risk_level: string;
  requested_at: number;
  flags: FraudFlag[];
}

// ===========================
// COMPONENTE PRINCIPAL
// ===========================

export default function FraudDashboard() {
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [flags, setFlags] = useState<FraudFlag[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'flags' | 'withdrawals' | 'analytics'>('flags');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterReviewed, setFilterReviewed] = useState<string>('unreviewed');
  const [loading, setLoading] = useState(true);

  // ===========================
  // CARREGAR DADOS
  // ===========================

  useEffect(() => {
    loadDashboardData();
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [filterSeverity, filterReviewed]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Carregar estatísticas
      const statsRes = await fetch('/api/fraud/stats');
      const statsData = await statsRes.json();
      setStats(statsData);

      // Carregar flags
      const flagsRes = await fetch(
        `/api/fraud/flags?severity=${filterSeverity}&reviewed=${filterReviewed}`
      );
      const flagsData = await flagsRes.json();
      setFlags(flagsData.flags || []);

      // Carregar saques pendentes de aprovação
      const withdrawalsRes = await fetch('/api/fraud/pending-withdrawals');
      const withdrawalsData = await withdrawalsRes.json();
      setWithdrawals(withdrawalsData.withdrawals || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // ===========================
  // AÇÕES
  // ===========================

  const reviewFlag = async (flagId: string, action: 'dismiss' | 'escalate') => {
    try {
      await fetch(`/api/fraud/flags/${flagId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      loadDashboardData();
    } catch (error) {
      console.error('Erro ao revisar flag:', error);
    }
  };

  const approveWithdrawal = async (withdrawalId: string, approved: boolean) => {
    try {
      await fetch(`/api/fraud/withdrawals/${withdrawalId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved })
      });
      
      loadDashboardData();
    } catch (error) {
      console.error('Erro ao aprovar saque:', error);
    }
  };

  const blockUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja bloquear este usuário?')) return;
    
    try {
      await fetch(`/api/fraud/users/${userId}/block`, {
        method: 'POST'
      });
      
      loadDashboardData();
    } catch (error) {
      console.error('Erro ao bloquear usuário:', error);
    }
  };

  // ===========================
  // RENDERIZAÇÃO
  // ===========================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-8 h-8 text-red-500" />
          Sistema de Detecção de Fraudes
        </h1>
        <p className="text-gray-600 mt-1">
          Monitoramento em tempo real de transações suspeitas
        </p>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<AlertTriangle className="w-6 h-6" />}
            label="Flags Não Revisadas"
            value={stats.unreviewed_flags}
            color="yellow"
          />
          <StatCard
            icon={<XCircle className="w-6 h-6" />}
            label="Flags Críticas"
            value={stats.critical_flags}
            color="red"
          />
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Usuários Alto Risco"
            value={stats.high_risk_users}
            color="orange"
          />
          <StatCard
            icon={<DollarSign className="w-6 h-6" />}
            label="Valor Protegido"
            value={`R$ ${stats.saved_amount.toLocaleString('pt-BR')}`}
            color="green"
          />
        </div>
      )}

      {/* Tendências */}
      {stats?.recent_trends && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Novas Flags Hoje</p>
              <p className="text-2xl font-bold">{stats.recent_trends.new_flags_today}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Últimos 7 Dias</p>
              <p className="text-2xl font-bold">{stats.recent_trends.new_flags_week}</p>
            </div>
            <div className={`flex items-center gap-1 ${
              stats.recent_trends.trend === 'up' ? 'text-red-500' :
              stats.recent_trends.trend === 'down' ? 'text-green-500' :
              'text-gray-500'
            }`}>
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold capitalize">{stats.recent_trends.trend}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <TabButton
              active={activeTab === 'flags'}
              onClick={() => setActiveTab('flags')}
              label="Flags de Fraude"
              badge={stats?.unreviewed_flags}
            />
            <TabButton
              active={activeTab === 'withdrawals'}
              onClick={() => setActiveTab('withdrawals')}
              label="Saques Pendentes"
              badge={withdrawals.length}
            />
            <TabButton
              active={activeTab === 'analytics'}
              onClick={() => setActiveTab('analytics')}
              label="Analytics"
            />
          </nav>
        </div>

        {/* Conteúdo das Tabs */}
        <div className="p-6">
          {activeTab === 'flags' && (
            <FlagsTab
              flags={flags}
              filterSeverity={filterSeverity}
              filterReviewed={filterReviewed}
              onFilterSeverityChange={setFilterSeverity}
              onFilterReviewedChange={setFilterReviewed}
              onReview={reviewFlag}
              onBlockUser={blockUser}
            />
          )}

          {activeTab === 'withdrawals' && (
            <WithdrawalsTab
              withdrawals={withdrawals}
              onApprove={approveWithdrawal}
              onBlockUser={blockUser}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab stats={stats} />
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================
// COMPONENTES AUXILIARES
// ===========================

function StatCard({ icon, label, value, color }: any) {
  const colorClasses = {
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    orange: 'bg-orange-100 text-orange-800',
    green: 'bg-green-100 text-green-800'
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 text-sm font-medium border-b-2 ${
        active
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {label}
      {badge > 0 && (
        <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
          {badge}
        </span>
      )}
    </button>
  );
}

function FlagsTab({ flags, filterSeverity, filterReviewed, onFilterSeverityChange, onFilterReviewedChange, onReview, onBlockUser }: any) {
  return (
    <div>
      {/* Filtros */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Severidade
          </label>
          <select
            value={filterSeverity}
            onChange={(e) => onFilterSeverityChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="all">Todas</option>
            <option value="critical">Crítica</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filterReviewed}
            onChange={(e) => onFilterReviewedChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="unreviewed">Não Revisadas</option>
            <option value="reviewed">Revisadas</option>
            <option value="all">Todas</option>
          </select>
        </div>
      </div>

      {/* Lista de Flags */}
      <div className="space-y-4">
        {flags.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">Nenhuma flag encontrada</p>
            <p className="text-sm">Tudo está seguro! 🎉</p>
          </div>
        ) : (
          flags.map((flag: FraudFlag) => (
            <FlagCard
              key={flag.id}
              flag={flag}
              onReview={onReview}
              onBlockUser={onBlockUser}
            />
          ))
        )}
      </div>
    </div>
  );
}

function FlagCard({ flag, onReview, onBlockUser }: any) {
  const severityColors = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-blue-100 text-blue-800 border-blue-300'
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${severityColors[flag.severity]}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{flag.user_name}</span>
            <span className="text-sm opacity-75">{flag.user_email}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${severityColors[flag.severity]}`}>
              {flag.severity}
            </span>
          </div>
          
          <p className="text-sm font-medium mb-1">{flag.flag_type}</p>
          <p className="text-sm">{flag.description}</p>
          
          {flag.metadata && (
            <div className="mt-2 text-xs font-mono bg-white bg-opacity-50 rounded p-2">
              {JSON.stringify(flag.metadata, null, 2)}
            </div>
          )}
        </div>

        {!flag.reviewed && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => onReview(flag.id, 'dismiss')}
              className="px-3 py-1 bg-white bg-opacity-75 rounded hover:bg-opacity-100 text-sm font-medium"
            >
              Dispensar
            </button>
            <button
              onClick={() => onReview(flag.id, 'escalate')}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
            >
              Escalar
            </button>
            <button
              onClick={() => onBlockUser(flag.user_id)}
              className="px-3 py-1 bg-black text-white rounded hover:bg-gray-900 text-sm font-medium"
            >
              Bloquear Usuário
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs opacity-75 mt-2">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(flag.created_at * 1000).toLocaleString('pt-BR')}
        </span>
        {flag.auto_generated && (
          <span className="bg-white bg-opacity-50 px-2 py-0.5 rounded">
            Auto-detectada
          </span>
        )}
      </div>
    </div>
  );
}

function WithdrawalsTab({ withdrawals, onApprove, onBlockUser }: any) {
  return (
    <div className="space-y-4">
      {withdrawals.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <p className="text-lg font-medium">Nenhum saque pendente</p>
        </div>
      ) : (
        withdrawals.map((withdrawal: WithdrawalRequest) => (
          <WithdrawalCard
            key={withdrawal.id}
            withdrawal={withdrawal}
            onApprove={onApprove}
            onBlockUser={onBlockUser}
          />
        ))
      )}
    </div>
  );
}

function WithdrawalCard({ withdrawal, onApprove, onBlockUser }: any) {
  const riskColors = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    critical: 'text-red-600'
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{withdrawal.user_name}</span>
            <span className={`text-sm font-bold ${riskColors[withdrawal.risk_level]}`}>
              Risco: {withdrawal.risk_level.toUpperCase()}
            </span>
          </div>
          
          <p className="text-2xl font-bold text-gray-900">
            R$ {withdrawal.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          
          <p className="text-sm text-gray-600 mt-1">
            Score de Fraude: {withdrawal.fraud_score}/100
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onApprove(withdrawal.id, false)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
          >
            Rejeitar
          </button>
          <button
            onClick={() => onApprove(withdrawal.id, true)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
          >
            Aprovar
          </button>
        </div>
      </div>

      {withdrawal.flags.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-gray-700">
            Flags Associadas:
          </p>
          {withdrawal.flags.map((flag: any, i: number) => (
            <div key={i} className="text-sm bg-red-50 border border-red-200 rounded p-2">
              <span className="font-medium">{flag.flag_type}:</span> {flag.description}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        Solicitado em: {new Date(withdrawal.requested_at * 1000).toLocaleString('pt-BR')}
      </div>
    </div>
  );
}

function AnalyticsTab({ stats }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6">
        <h3 className="text-xl font-bold mb-2">Visão Geral de Segurança</h3>
        <p className="text-sm opacity-90">
          Sistema de detecção de fraudes ativo e monitorando transações em tempo real
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold mb-4">Distribuição de Severidade</h4>
          {/* Aqui você pode adicionar um gráfico com recharts ou similar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Crítica</span>
              <span className="text-sm font-bold text-red-600">{stats?.critical_flags || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Alta</span>
              <span className="text-sm font-bold text-orange-600">-</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Média</span>
              <span className="text-sm font-bold text-yellow-600">-</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Baixa</span>
              <span className="text-sm font-bold text-blue-600">-</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold mb-4">Economia Total</h4>
          <p className="text-3xl font-bold text-green-600">
            R$ {(stats?.saved_amount || 0).toLocaleString('pt-BR')}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Valor protegido através de bloqueios automáticos
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">Sistema Ativo</p>
            <p className="text-sm text-blue-700">
              Todas as transações estão sendo monitoradas 24/7 com detecção automática de padrões suspeitos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
