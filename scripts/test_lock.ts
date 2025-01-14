import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wbvdroekaexvagpqytkn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidmRyb2VrYWV4dmFncHF5dGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgwODcwNCwiZXhwIjoyMDUyMzg0NzA0fQ.8PsB4d7jmDup48lvCYPILIfd-QQqEYCk3oH2nggN2jU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testLock() {
  try {
    // Try to insert a test lock
    const { error: insertError } = await supabase
      .from('locks')
      .insert({
        id: 'test_lock',
        acquired_at: new Date().toISOString(),
        locked_by: 'test_script'
      });

    if (insertError) {
      console.error('Error inserting lock:', insertError);
      return;
    }

    console.log('Successfully inserted test lock');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to delete the test lock
    const { error: deleteError } = await supabase
      .from('locks')
      .delete()
      .eq('id', 'test_lock');

    if (deleteError) {
      console.error('Error deleting lock:', deleteError);
    } else {
      console.log('Successfully deleted test lock');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testLock().catch(console.error);
