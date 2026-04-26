-- supabase/migrations/003_realtime_config.sql
-- Enable Supabase Realtime publication on specific tables

-- Add tables to the realtime publication
ALTER PUBLICATION supabase_realtime
    ADD TABLE tasks;

ALTER PUBLICATION supabase_realtime
    ADD TABLE decisions;

ALTER PUBLICATION supabase_realtime
    ADD TABLE documents;

ALTER PUBLICATION supabase_realtime
    ADD TABLE escalations;

ALTER PUBLICATION supabase_realtime
    ADD TABLE case_profile;

ALTER PUBLICATION supabase_realtime
    ADD TABLE cases;

-- Verify publication
SELECT pubname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
