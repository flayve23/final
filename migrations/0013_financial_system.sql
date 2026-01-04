-- V104 SPRINT 2: Sistema Financeiro
-- Criado em: 2025-12-31

-- Tabela de Chargebacks (disputas de pagamento)
CREATE TABLE IF NOT EXISTS chargebacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id TEXT NOT NULL UNIQUE, -- ID do pagamento no Mercado Pago
  transaction_id INTEGER NOT NULL, -- ID da transação local
  user_id INTEGER NOT NULL, -- Viewer que contestou
  streamer_id INTEGER, -- Streamer afetado
  call_id INTEGER, -- Chamada relacionada
  amount DECIMAL(10, 2) NOT NULL, -- Valor em disputa
  reason TEXT, -- Motivo da contestação (do MP)
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'investigating', 'accepted', 'rejected', 'resolved')),
  admin_decision TEXT, -- 'refund', 'keep', 'partial'
  admin_notes TEXT, -- Observações do admin
  resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (streamer_id) REFERENCES users(id),
  FOREIGN KEY (call_id) REFERENCES calls(id)
);

CREATE INDEX idx_chargebacks_status ON chargebacks(status);
CREATE INDEX idx_chargebacks_user ON chargebacks(user_id);
CREATE INDEX idx_chargebacks_created ON chargebacks(created_at);

-- Adicionar campo paid em transactions (para pagamentos D+30)
ALTER TABLE transactions ADD COLUMN paid BOOLEAN DEFAULT 0;
ALTER TABLE transactions ADD COLUMN paid_at DATETIME;
ALTER TABLE transactions ADD COLUMN payment_method TEXT; -- 'pix', 'bank_transfer'
ALTER TABLE transactions ADD COLUMN payment_reference TEXT; -- Comprovante/ID externo

-- Tabela de agendamento de pagamentos (D+30)
CREATE TABLE IF NOT EXISTS scheduled_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  streamer_id INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  period_start DATE NOT NULL, -- Início do período (30 dias atrás)
  period_end DATE NOT NULL, -- Fim do período (hoje)
  due_date DATE NOT NULL, -- Data prevista de pagamento (D+30)
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  payment_method TEXT, -- 'pix', 'bank_transfer'
  payment_reference TEXT, -- ID da transferência MP
  error_message TEXT, -- Em caso de falha
  processed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (streamer_id) REFERENCES users(id)
);

CREATE INDEX idx_scheduled_payments_status ON scheduled_payments(status);
CREATE INDEX idx_scheduled_payments_due_date ON scheduled_payments(due_date);
CREATE INDEX idx_scheduled_payments_streamer ON scheduled_payments(streamer_id);

-- Adicionar campos para análise de chargebacks
ALTER TABLE calls ADD COLUMN has_chargeback BOOLEAN DEFAULT 0;
ALTER TABLE calls ADD COLUMN chargeback_id INTEGER;

-- Tabela de métricas financeiras (cache para relatórios)
CREATE TABLE IF NOT EXISTS financial_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_date DATE NOT NULL UNIQUE,
  total_revenue DECIMAL(15, 2) DEFAULT 0, -- Receita bruta
  platform_fee DECIMAL(15, 2) DEFAULT 0, -- Taxa da plataforma (20%)
  streamer_earnings DECIMAL(15, 2) DEFAULT 0, -- Ganhos dos streamers (80%)
  total_calls INTEGER DEFAULT 0,
  total_viewers INTEGER DEFAULT 0,
  total_streamers_active INTEGER DEFAULT 0,
  avg_call_duration INTEGER DEFAULT 0, -- Em segundos
  avg_call_value DECIMAL(10, 2) DEFAULT 0,
  chargebacks_count INTEGER DEFAULT 0,
  chargebacks_amount DECIMAL(10, 2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metrics_date ON financial_metrics(metric_date);
