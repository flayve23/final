-- Migration: 0003_dynamic_commission.sql

ALTER TABLE profiles ADD COLUMN custom_commission_rate DECIMAL(5, 2); -- Ex: 0.20 para 20%. Se NULL, usa padrão.
