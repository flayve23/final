// src/pages/admin/ModerationDashboard.tsx
// Dashboard de Moderação - FLAYVE

import { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Flag,
  User,
  MessageSquare,
  Video,
  Clock,
  Eye,
  Ban,
  Trash2
} from 'lucide-react';

// ===========================
// TIPOS
// ===========================

interface Report {
  id: string;
  reporter_id: string;
  reporter_name: string;
  reported_id: string;
  reported_name: string;
  reported_type: 'user' | 'message' | 'call';
  reason: string;
  description: string;
  evidence_url?: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  moderator_id?: string;
  moderator_name?: string;
  resolution_notes?: string;
  created_at: number;
  updated_at?: number;
}

interface ModerationStats {
  total_reports: number;
  pending_reports: number;
  resolved_today: number;
  average_response_time: number;
  urgent_reports: number;
  by_type: {
    user: number;
    message: number;
    call: number;
  };
  by_reason: {
    [key: string]: number;
  };
}

// ===========================
// COMPONENTE PRINCIPAL
// ===========================

export default function ModerationDashboard() {
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('pending');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  // ===========================
  // CARREGAR DADOS
  // ===========================

  useEffect(() => {
    loadModerationData();
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadModerationData, 30000);
    return () => clearInterval(interval);
  }, [activeFilter]);

  const loadModerationData = async () => {
    try {
      setLoading(true);
      
      // Carregar estatísticas
      const statsRes = await fetch('/api/moderation/stats');
      const statsData = await statsRes.json();
      setStats(statsData);

      // Carregar denúncias
      const reportsRes = await fetch(
        `/api/moderation/reports?status=${activeFilter}`
      );
      const reportsData = await reportsRes.json();
      setReports(reportsData.reports || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // ===========================
  // AÇÕES DE MODERAÇÃO
  // ===========================

  const reviewReport = async (reportId: string, action: 'approve' | 'dismiss', notes: string) => {
    try {
      await fetch(`/api/moderation/reports/${reportId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes })
      });
      
      setSelectedReport(null);
      loadModerationData();
    } catch (error) {
      console.error('Erro ao revisar denúncia:', error);
    }
  };

  const banUser = async (userId: string, duration: number, reason: string) => {
    try {
      await fetch(`/api/moderation/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration, reason })
      });
      
      loadModerationData();
    } catch (error) {
      console.error('Erro ao banir usuário:', error);
    }
  };

  const deleteContent = async (contentId: string, contentType: string) => {
    try {
      await fetch(`/api/moderation/content/${contentType}/${contentId}`, {
        method: 'DELETE'
      });
      
      loadModerationData();
    } catch (error) {
      console.error('Erro ao deletar conteúdo:', error);
    }
  };

  // ===========================
  // RENDERIZAÇÃO
  // ===========================

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-8 h-8 text-purple-500" />
          Moderação de Conteúdo
        </h1>
        <p className="text-gray-600 mt-1">
          Gerencie denúncias e mantenha a comunidade segura
        </p>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Flag className="w-6 h-6" />}
            label="Denúncias Pendentes"
            value={stats.pending_reports}
            color="yellow"
            urgent={stats.urgent_reports > 0}
            urgentLabel={`${stats.urgent_reports} urgentes`}
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            label="Resolvidas Hoje"
            value={stats.resolved_today}
            color="green"
          />
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            label="Tempo Médio"
            value={`${Math.round(stats.average_response_time / 60)}min`}
            color="blue"
          />
          <StatCard
            icon={<AlertTriangle className="w-6 h-6" />}
            label="Total de Denúncias"
            value={stats.total_reports}
            color="purple"
          />
        </div>
      )}

      {/* Distribuição por Tipo */}
      {stats && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="font-semibold mb-3">Distribuição por Tipo</h3>
          <div className="flex gap-4">
            <TypeBadge
              icon={<User className="w-4 h-4" />}
              label="Usuários"
              count={stats.by_type.user}
            />
            <TypeBadge
              icon={<MessageSquare className="w-4 h-4" />}
              label="Mensagens"
              count={stats.by_type.message}
            />
            <TypeBadge
              icon={<Video className="w-4 h-4" />}
              label="Chamadas"
              count={stats.by_type.call}
            />
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <FilterButton
              active={activeFilter === 'pending'}
              onClick={() => setActiveFilter('pending')}
              label="Pendentes"
              badge={stats?.pending_reports}
            />
            <FilterButton
              active={activeFilter === 'under_review'}
              onClick={() => setActiveFilter('under_review')}
              label="Em Análise"
            />
            <FilterButton
              active={activeFilter === 'resolved'}
              onClick={() => setActiveFilter('resolved')}
              label="Resolvidas"
            />
            <FilterButton
              active={activeFilter === 'dismissed'}
              onClick={() => setActiveFilter('dismissed')}
              label="Dispensadas"
            />
          </nav>
        </div>

        {/* Lista de Denúncias */}
        <div className="p-6">
          {reports.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">Nenhuma denúncia encontrada</p>
              <p className="text-sm">Tudo está tranquilo! 🎉</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onSelect={() => setSelectedReport(report)}
                  onReview={reviewReport}
                  onBanUser={banUser}
                  onDeleteContent={deleteContent}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes */}
      {selectedReport && (
        <ReportModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onReview={reviewReport}
          onBanUser={banUser}
          onDeleteContent={deleteContent}
        />
      )}
    </div>
  );
}

// ===========================
// COMPONENTES AUXILIARES
// ===========================

function StatCard({ icon, label, value, color, urgent, urgentLabel }: any) {
  const colorClasses = {
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800'
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
          {urgent && (
            <p className="text-xs text-red-600 font-semibold mt-1">
              {urgentLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TypeBadge({ icon, label, count }: any) {
  return (
    <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
      {icon}
      <span className="text-sm font-medium">{label}</span>
      <span className="bg-gray-300 text-gray-700 text-xs font-bold rounded-full px-2 py-0.5">
        {count}
      </span>
    </div>
  );
}

function FilterButton({ active, onClick, label, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 text-sm font-medium border-b-2 ${
        active
          ? 'border-purple-500 text-purple-600'
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

function ReportCard({ report, onSelect, onReview, onBanUser, onDeleteContent }: any) {
  const priorityColors = {
    urgent: 'bg-red-100 border-red-300 text-red-800',
    high: 'bg-orange-100 border-orange-300 text-orange-800',
    medium: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    low: 'bg-blue-100 border-blue-300 text-blue-800'
  };

  const typeIcons = {
    user: <User className="w-4 h-4" />,
    message: <MessageSquare className="w-4 h-4" />,
    call: <Video className="w-4 h-4" />
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${priorityColors[report.priority]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white bg-opacity-75 px-2 py-1 rounded flex items-center gap-1 text-sm font-medium">
              {typeIcons[report.reported_type]}
              {report.reported_type}
            </span>
            <span className="text-xs px-2 py-1 rounded-full font-semibold uppercase bg-white bg-opacity-75">
              {report.priority}
            </span>
          </div>

          <p className="font-semibold mb-1">
            Denunciado: <span className="font-normal">{report.reported_name}</span>
          </p>
          
          <p className="text-sm mb-1">
            <span className="font-medium">Motivo:</span> {report.reason}
          </p>
          
          {report.description && (
            <p className="text-sm italic">&quot;{report.description}&quot;</p>
          )}

          <div className="flex items-center gap-4 text-xs mt-3 opacity-75">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(report.created_at * 1000).toLocaleString('pt-BR')}
            </span>
            <span>Por: {report.reporter_name}</span>
          </div>
        </div>

        {report.status === 'pending' && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => onSelect()}
              className="px-3 py-1 bg-white bg-opacity-75 rounded hover:bg-opacity-100 text-sm font-medium flex items-center gap-1"
            >
              <Eye className="w-4 h-4" />
              Ver Detalhes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportModal({ report, onClose, onReview, onBanUser, onDeleteContent }: any) {
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState<'approve' | 'dismiss' | null>(null);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Detalhes da Denúncia</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Informações</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p><strong>Tipo:</strong> {report.reported_type}</p>
              <p><strong>Denunciado:</strong> {report.reported_name}</p>
              <p><strong>Denunciante:</strong> {report.reporter_name}</p>
              <p><strong>Motivo:</strong> {report.reason}</p>
              <p><strong>Prioridade:</strong> {report.priority}</p>
              <p><strong>Data:</strong> {new Date(report.created_at * 1000).toLocaleString('pt-BR')}</p>
            </div>
          </div>

          {report.description && (
            <div>
              <h3 className="font-semibold mb-2">Descrição</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="italic">&quot;{report.description}&quot;</p>
              </div>
            </div>
          )}

          {report.evidence_url && (
            <div>
              <h3 className="font-semibold mb-2">Evidência</h3>
              <img
                src={report.evidence_url}
                alt="Evidência"
                className="rounded-lg max-w-full"
              />
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-2">Notas da Moderação</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione notas sobre sua decisão..."
              className="w-full border border-gray-300 rounded-lg p-3 min-h-[100px]"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                onReview(report.id, 'dismiss', notes);
                onClose();
              }}
              className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
            >
              Dispensar Denúncia
            </button>
            <button
              onClick={() => {
                onReview(report.id, 'approve', notes);
                onClose();
              }}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
            >
              Aprovar Denúncia
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-semibold mb-2">Ações Adicionais</h3>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (confirm('Banir usuário temporariamente (7 dias)?')) {
                    onBanUser(report.reported_id, 7, notes);
                    onClose();
                  }
                }}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium flex items-center justify-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Banir 7 Dias
              </button>
              <button
                onClick={() => {
                  if (confirm('Banir usuário permanentemente?')) {
                    onBanUser(report.reported_id, -1, notes);
                    onClose();
                  }
                }}
                className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-medium flex items-center justify-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Banir Permanente
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
