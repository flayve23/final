-- Add visibility settings to profiles
ALTER TABLE profiles ADD COLUMN is_public BOOLEAN DEFAULT 1;
ALTER TABLE profiles ADD COLUMN allow_calls_from TEXT DEFAULT 'all'; -- 'all', 'favorites', 'none'
