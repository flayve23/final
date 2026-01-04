-- =====================================================
-- SPRINT 3 - PARTE 1: SISTEMA DE NOTIFICAÇÕES
-- =====================================================

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'call_incoming', 'payment_received', 'kyc_approved', 'kyc_rejected', 'chargeback', 'ticket_reply', 'scheduled_payment'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT, -- JSON adicional (call_id, ticket_id, etc)
  read INTEGER DEFAULT 0, -- 0 = não lida, 1 = lida
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- =====================================================
-- SPRINT 3 - PARTE 2: SISTEMA DE TICKETS
-- =====================================================

-- Tabela de tickets de suporte
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL, -- 'technical', 'payment', 'account', 'abuse', 'other'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'waiting_user', 'waiting_admin', 'resolved', 'closed'
  assigned_to TEXT, -- admin_user_id
  last_reply_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX idx_tickets_updated ON tickets(updated_at DESC);

-- Mensagens do ticket (chat)
CREATE TABLE IF NOT EXISTS ticket_messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  ticket_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  is_admin INTEGER DEFAULT 0, -- 1 se foi admin que respondeu
  attachments TEXT, -- JSON array de URLs
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_ticket_messages_ticket ON ticket_messages(ticket_id, created_at);

-- =====================================================
-- SPRINT 3 - PARTE 3: AGENDA DO STREAMER
-- =====================================================

-- Horários disponíveis do streamer (recorrente)
CREATE TABLE IF NOT EXISTS availability_schedule (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  streamer_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Domingo, 1=Segunda, ..., 6=Sábado
  start_time TEXT NOT NULL, -- HH:MM (ex: '09:00')
  end_time TEXT NOT NULL, -- HH:MM (ex: '17:00')
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (streamer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_availability_streamer ON availability_schedule(streamer_id, is_active);

-- Bloqueios específicos (férias, compromissos)
CREATE TABLE IF NOT EXISTS blocked_slots (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  streamer_id TEXT NOT NULL,
  start_datetime TEXT NOT NULL, -- ISO 8601 (ex: '2025-01-15T10:00:00Z')
  end_datetime TEXT NOT NULL,
  reason TEXT, -- 'vacation', 'appointment', 'emergency', 'other'
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (streamer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_blocked_slots_streamer ON blocked_slots(streamer_id);
CREATE INDEX idx_blocked_slots_datetime ON blocked_slots(start_datetime, end_datetime);

-- Adicionar flag de "auto-aceitar chamadas" no perfil do streamer
-- (Será usado junto com a agenda para aceitar automaticamente)
-- Nota: Isso pode ser adicionado como coluna em 'profiles' ou preferência separada
-- Por enquanto, vamos criar uma tabela de preferências do streamer

CREATE TABLE IF NOT EXISTS streamer_preferences (
  streamer_id TEXT PRIMARY KEY,
  auto_accept_calls INTEGER DEFAULT 0, -- 1 = aceita automaticamente dentro do horário
  require_booking INTEGER DEFAULT 0, -- 1 = exige agendamento prévio
  min_booking_notice INTEGER DEFAULT 0, -- minutos de antecedência (ex: 30)
  max_concurrent_calls INTEGER DEFAULT 1, -- quantas chamadas simultâneas permitir
  break_between_calls INTEGER DEFAULT 5, -- minutos de pausa entre chamadas
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (streamer_id) REFERENCES users(id) ON DELETE CASCADE
);
