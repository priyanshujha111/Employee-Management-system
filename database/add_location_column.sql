-- Add location column to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS location VARCHAR(50);
