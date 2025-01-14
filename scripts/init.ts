import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://wbvdroekaexvagpqytkn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidmRyb2VrYWV4dmFncHF5dGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgwODcwNCwiZXhwIjoyMDUyMzg0NzA0fQ.8PsB4d7jmDup48lvCYPILIfd-QQqEYCk3oH2nggN2jU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function initDatabase() {
  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'init_database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL to create functions
    const { error: sqlError } = await supabase.rpc('exec_sql', { sql });
    if (sqlError) {
      console.error('Error creating database functions:', sqlError);
      return;
    }

    // Now call the init_database function
    const { error: initError } = await supabase.rpc('init_database');
    if (initError) {
      console.error('Error initializing database:', initError);
      return;
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error:', error);
  }
}

initDatabase().catch(console.error);
