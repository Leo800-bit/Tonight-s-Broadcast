-- Tonight's Broadcast - Database Schema
-- Run this in Supabase SQL Editor

-- Broadcasts table
CREATE TABLE broadcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  title TEXT NOT NULL,
  opening TEXT NOT NULL,
  atmosphere TEXT NOT NULL,
  listener_message TEXT NOT NULL,
  reply TEXT NOT NULL,
  story TEXT NOT NULL,
  thought TEXT NOT NULL,
  closing TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

-- Allow public read access to broadcasts
CREATE POLICY "Allow public read broadcasts"
  ON broadcasts FOR SELECT
  USING (true);

-- Allow service role to insert broadcasts
CREATE POLICY "Allow service insert broadcasts"
  ON broadcasts FOR INSERT
  WITH CHECK (true);

-- Messages (listener messages) table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow public insert for messages
CREATE POLICY "Allow public insert messages"
  ON messages FOR INSERT
  WITH CHECK (true);

-- Allow public read for messages
CREATE POLICY "Allow public read messages"
  ON messages FOR SELECT
  USING (true);

-- Index for efficient date queries
CREATE INDEX idx_broadcasts_date ON broadcasts(date DESC);
