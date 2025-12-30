-- Migration: 0001_initial_schema.sql

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK(role IN ('admin', 'streamer', 'viewer')),
  email_verified BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PROFILES TABLE (Streamer info)
CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  photo_url TEXT,
  bio TEXT,
  price_per_minute DECIMAL(10, 2) DEFAULT 1.99,
  is_online BOOLEAN DEFAULT 0,
  total_earnings DECIMAL(15, 2) DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  tags TEXT, -- JSON string array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- CALLS TABLE
CREATE TABLE IF NOT EXISTS calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  streamer_id INTEGER NOT NULL,
  viewer_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'completed', 'rejected', 'failed')),
  started_at DATETIME,
  ended_at DATETIME,
  duration_seconds INTEGER DEFAULT 0,
  cost_total DECIMAL(10, 2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (streamer_id) REFERENCES users(id),
  FOREIGN KEY (viewer_id) REFERENCES users(id)
);

-- TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('deposit', 'withdrawal', 'call_payment', 'call_earning', 'tip')),
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed')),
  metadata TEXT, -- JSON for additional info
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- KYC VERIFICATIONS
CREATE TABLE IF NOT EXISTS kyc_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  documents_url TEXT, -- JSON array of URLs
  admin_notes TEXT,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_profiles_online ON profiles(is_online);
CREATE INDEX idx_calls_streamer ON calls(streamer_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
