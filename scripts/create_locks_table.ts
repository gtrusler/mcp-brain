import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wbvdroekaexvagpqytkn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidmRyb2VrYWV4dmFncHF5dGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgwODcwNCwiZXhwIjoyMDUyMzg0NzA0fQ.8PsB4d7jmDup48lvCYPILIfd-QQqEYCk3oH2nggN2jU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createLocksTable() {
  try {
    // Create the locks table
    const { error } = await supabase.rpc('create_locks_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS locks (
          id TEXT PRIMARY KEY,
          acquired_at TIMESTAMP WITH TIME ZONE NOT NULL,
          locked_by TEXT NOT NULL
        );
      `
    });

    if (error) {
      console.error('Error creating locks table:', error);
    } else {
      console.log('Locks table created successfully');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

createLocksTable().catch(console.error);
