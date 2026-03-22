import { supabase } from '@/lib/supabase';

export async function deleteCurrentAccount() {
  return supabase.functions.invoke('delete-account');
}
