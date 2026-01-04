// src/pages/admin/ReconciliationDashboard.tsx
// Dashboard de Reconciliação Financeira - FLAYVE

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Download,
  Calendar,
  RefreshCw,
  FileText,
  Clock
} from 'lucide-react';

// ===========================
// TIPOS
// ===========================

interface ReconciliationReport {
  id: string;
  date: string;
  status: 'completed' | 'in_progress' | 'failed';
  total_transactions: number;
  total_amount: number;
  discrepancies: number;
  created_at: number;
  completed_at?: number;
}

interface Discrepancy {
  id: string;
  type: 'missing_payment' | 'duplicate_transaction' | 'amount_mismatch' | 'status_mismatch';
  transaction_id?: string;
  expected_amount?: number;
  actual_amount?: number;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  resolution_notes?: string;
  created_at: number;
}

interface FinancialSummary {
  today: {
    deposits: number;
    withdrawals: number;
    platform_fee: number;
    net: number;
  };
  week: {
    deposits: number;
    withdrawals: number;
    platform_fee: number;
    net: number;
  };
  month: {
    deposits: number;
    withdrawals: number;
    platform_fee: number;
    net: number;
  };
  pending_payouts: number;
  pending_withdrawals: number;
}

// ===========================
// COMPONENTE PRINCIPAL
// ===========================

export default function ReconciliationDashboard() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [reports, setReports] = useState<ReconciliationReport[]>([]);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [loading, setLoading] = useState(true);
  const [runningReconciliation, setRunningReconciliation] = useState(false);

  // ===========================
  // CARREGAR DADOS
  // ===========================

  useEffect(() => {
    loadReconciliationData();
    // Atualizar a cada 2 minutos
    const interval = setInterval(loadReconciliationData, 120000);
    return () => clearInterval(interval);
  }, []);

  const loadReconciliationData = async () => {
    try {
      setLoading(true);
      
      // Carregar resumo financeiro
      const summaryRes = await fetch('/api/reconciliation/summary');
      const summaryData = await summaryRes.json();
      setSummary(summaryData);

      // Carregar relatórios
      const reportsRes = await fetch('/api/reconciliation/reports?limit=30');
      const reportsData = await reportsRes.json();
      setReports(reportsData.reports || []);

      // Carregar discrepâncias não resolvidas
      const discrepanciesRes = await fetch('/api/reconciliation/discrepancies?resolved=false');
      const discrepanciesData = await discrepanciesRes.json();
      setDiscrepancies(discrepanciesData.discrepancies || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // ===========================
  // AÇÕES
  // ===========================

  const runReconciliation = async () => {
    try {
      setRunningReconciliation(true);
      
      const res = await fetch('/api/reconciliation/run', {
        method: 'POST'
      });
      
      if (res.ok) {
        alert('Reconciliação iniciada com sucesso!');
        loadReconciliationData();
      } else {
        alert('Erro ao iniciar reconciliação');
      }
    } catch (error) {
      console.error('Erro ao executar reconciliação:', error);
      alert('Erro ao executar reconciliação');
    } finally {
      setRunningReconciliation(false);
    }
  };

  const downloadReport = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reconciliation/reports/${reportId}/download`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reconciliation_report_${reportId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar relatório:', error);
    }
  };

  const resolveDiscrepancy = async (discrepancyId: string, notes: string) => {
    try {
      await fetch(`/api/reconciliation/discrepancies/${discrepancyId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      
      loadReconciliationData();
    } catch (error) {
      console.error('Erro ao resolver discrepância:', error);
    }
  };

  // ===========================
  // RENDERIZAÇÃO
  // ===========================

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const selectedSummary = summary?.[selectedPeriod];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-green-500" />
            Reconciliação Financeira
          </h1>
          <p className="text-gray-600 mt-1">
            Monitoramento e auditoria de transações
          </p>
        </div>
        
        <button
          onClick={runReconciliation}
          disabled={runningReconciliation}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-5 h-5 ${runningReconciliation ? 'animate-spin' : ''}`} />
          {runningReconciliation ? 'Executando...' : 'Executar Reconciliação'}
        </button>
      </div>

      {/* Seletor de Período */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2">
          <PeriodButton
            active={selectedPeriod === 'today'}
            onClick={() => setSelectedPeriod('today')}
            label="Hoje"
          />
          <PeriodButton
            active={selectedPeriod === 'week'}
            onClick={() => setSelectedPeriod('week')}
            label="Esta Semana"
          />
          <PeriodButton
            active={selectedPeriod === 'month'}
            onClick={() => setSelectedPeriod('month')}
            label="Este Mês"
          />
        </div>
      </div>

      {/* Resumo Financeiro */}
      {selectedSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <FinancialCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Depósitos"
            value={selectedSummary.deposits}
            color="green"
          />
          <FinancialCard
            icon={<DollarSign className="w-6 h-6" />}
            label="Saques"
            value={selectedSummary.withdrawals}
            color="red"
          />
          <FinancialCard
            icon={<FileText className="w-6 h-6" />}
            label="Taxa Plataforma"
            value={selectedSummary.platform_fee}
            color="blue"
          />
          <FinancialCard
            icon={<CheckCircle className="w-6 h-6" />}
            label="Líquido"
            value={selectedSummary.net}
            color="purple"
            highlight
          />
        </div>
      )}

      {/* Pagamentos Pendentes */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-800 font-medium">Pagamentos D+30 Pendentes</p>
                <p className="text-2xl font-bold text-yellow-900">
                  R$ {summary.pending_payouts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-800 font-medium">Saques Pendentes</p>
                <p className="text-2xl font-bold text-blue-900">
                  R$ {summary.pending_withdrawals.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>
      )}

      {/* Discrepâncias */}
      {discrepancies.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              Discrepâncias Não Resolvidas ({discrepancies.length})
            </h2>
          </div>
          <div className="p-6 space-y-3">
            {discrepancies.map((discrepancy) => (
              <DiscrepancyCard
                key={discrepancy.id}
                discrepancy={discrepancy}
                onResolve={resolveDiscrepancy}
              />
            ))}
          </div>
        </div>
      )}

      {/* Histórico de Relatórios */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">Histórico de Reconciliações</h2>
        </div>
        <div className="p-6">
          {reports.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Nenhum relatório disponível</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onDownload={downloadReport}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================
// COMPONENTES AUXILIARES
// ===========================

function PeriodButton({ active, onClick, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-green-500 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

function FinancialCard({ icon, label, value, color, highlight }: any) {
  const colorClasses = {
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className={`rounded-lg shadow p-4 ${highlight ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white' : 'bg-white'}`}>
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${highlight ? 'bg-white bg-opacity-20' : colorClasses[color]}`}>
          {icon}
        </div>
        <div className="text-right">
          <p className={`text-sm ${highlight ? 'text-purple-100' : 'text-gray-600'}`}>{label}</p>
          <p className="text-2xl font-bold">
            R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
}

function DiscrepancyCard({ discrepancy, onResolve }: any) {
  const [notes, setNotes] = useState('');
  const [showResolve, setShowResolve] = useState(false);

  const severityColors = {
    critical: 'bg-red-100 border-red-300 text-red-800',
    high: 'bg-orange-100 border-orange-300 text-orange-800',
    medium: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    low: 'bg-blue-100 border-blue-300 text-blue-800'
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${severityColors[discrepancy.severity]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-1 rounded-full font-semibold uppercase bg-white bg-opacity-75">
              {discrepancy.severity}
            </span>
            <span className="text-xs font-medium opacity-75">{discrepancy.type}</span>
          </div>
          
          <p className="font-medium mb-2">{discrepancy.description}</p>
          
          {discrepancy.expected_amount && discrepancy.actual_amount && (
            <div className="text-sm space-y-1">
              <p>Esperado: R$ {discrepancy.expected_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p>Atual: R$ {discrepancy.actual_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="font-semibold">
                Diferença: R$ {Math.abs(discrepancy.expected_amount - discrepancy.actual_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
          
          <p className="text-xs mt-2 opacity-75">
            {new Date(discrepancy.created_at * 1000).toLocaleString('pt-BR')}
          </p>
        </div>

        <div className="ml-4">
          {!showResolve ? (
            <button
              onClick={() => setShowResolve(true)}
              className="px-4 py-2 bg-white bg-opacity-75 rounded hover:bg-opacity-100 font-medium text-sm"
            >
              Resolver
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas da resolução..."
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowResolve(false)}
                  className="px-2 py-1 bg-gray-300 rounded text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    onResolve(discrepancy.id, notes);
                    setShowResolve(false);
                    setNotes('');
                  }}
                  className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportCard({ report, onDownload }: any) {
  const statusColors = {
    completed: 'text-green-600 bg-green-100',
    in_progress: 'text-yellow-600 bg-yellow-100',
    failed: 'text-red-600 bg-red-100'
  };

  const statusLabels = {
    completed: 'Concluído',
    in_progress: 'Em Progresso',
    failed: 'Falhou'
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <span className="font-semibold">{report.date}</span>
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColors[report.status]}`}>
            {statusLabels[report.status]}
          </span>
        </div>
        
        <div className="text-sm text-gray-600 space-x-4">
          <span>{report.total_transactions} transações</span>
          <span>R$ {report.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          {report.discrepancies > 0 && (
            <span className="text-red-600 font-semibold">
              {report.discrepancies} discrepâncias
            </span>
          )}
        </div>
      </div>

      {report.status === 'completed' && (
        <button
          onClick={() => onDownload(report.id)}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Baixar CSV
        </button>
      )}
    </div>
  );
}
