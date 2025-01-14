import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wbvdroekaexvagpqytkn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidmRyb2VrYWV4dmFncHF5dGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgwODcwNCwiZXhwIjoyMDUyMzg0NzA0fQ.8PsB4d7jmDup48lvCYPILIfd-QQqEYCk3oH2nggN2jU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
  try {
    // Try to select from entities table
    const { data, error } = await supabase
      .from('entities')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error querying database:', error);
    } else {
      console.log('Successfully connected to database');
      console.log('Sample data:', data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testConnection().catch(console.error);
