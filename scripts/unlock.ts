import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wbvdroekaexvagpqytkn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidmRyb2VrYWV4dmFncHF5dGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgwODcwNCwiZXhwIjoyMDUyMzg0NzA0fQ.8PsB4d7jmDup48lvCYPILIfd-QQqEYCk3oH2nggN2jU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function clearLock() {
  const { error } = await supabase
    .from('locks')
    .delete()
    .eq('id', 'memory_lock');

  if (error) {
    console.error('Error clearing lock:', error);
  } else {
    console.log('Lock cleared successfully');
  }
}

clearLock().catch(console.error);
