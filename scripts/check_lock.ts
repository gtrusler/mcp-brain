import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wbvdroekaexvagpqytkn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidmRyb2VrYWV4dmFncHF5dGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgwODcwNCwiZXhwIjoyMDUyMzg0NzA0fQ.8PsB4d7jmDup48lvCYPILIfd-QQqEYCk3oH2nggN2jU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkLock() {
  try {
    // Check current locks
    const { data: locks, error: selectError } = await supabase
      .from('locks')
      .select('*');

    if (selectError) {
      console.error('Error checking locks:', selectError);
      return;
    }

    if (locks && locks.length > 0) {
      console.log('Current locks:', locks);

      // Try to delete any existing locks
      const { error: deleteError } = await supabase
        .from('locks')
        .delete()
        .eq('id', 'memory_lock');

      if (deleteError) {
        console.error('Error deleting lock:', deleteError);
      } else {
        console.log('Successfully deleted lock');
      }
    } else {
      console.log('No locks found in the table');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkLock().catch(console.error);
