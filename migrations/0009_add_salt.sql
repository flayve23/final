-- Add salt column for PBKDF2 auth security
ALTER TABLE users ADD COLUMN salt TEXT;
