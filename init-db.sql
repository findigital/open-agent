-- Initialize database for Proposal Writing SaaS
-- This script runs automatically when the PostgreSQL container starts

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE openagent TO openagent;

-- Log successful initialization
DO $$
BEGIN
  RAISE NOTICE 'Database initialized successfully with pgvector extension';
END $$;
