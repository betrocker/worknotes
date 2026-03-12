import { supabase, type DbClient } from '@/lib/supabase';

export type ClientInput = {
  name: string;
  phone?: string | null;
  address?: string | null;
  note?: string | null;
};

export async function listClients(userId: string): Promise<DbClient[]> {
  const { data, error } = await supabase
    .from('clients')
    .select()
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .overrideTypes<DbClient[], { merge: false }>();

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getClientById(userId: string, id: string): Promise<DbClient | null> {
  const { data, error } = await supabase
    .from('clients')
    .select()
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<DbClient, { merge: false }>();

  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function createClient(userId: string, input: ClientInput): Promise<DbClient> {
  const payload = {
    user_id: userId,
    name: input.name,
    phone: input.phone ?? null,
    address: input.address ?? null,
    note: input.note ?? null,
  };

  const { data, error } = await supabase
    .from('clients')
    .insert(payload)
    .select()
    .single()
    .overrideTypes<DbClient, { merge: false }>();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateClient(userId: string, id: string, input: ClientInput): Promise<DbClient> {
  const payload = {
    name: input.name,
    phone: input.phone ?? null,
    address: input.address ?? null,
    note: input.note ?? null,
  };

  const { data, error } = await supabase
    .from('clients')
    .update(payload)
    .eq('user_id', userId)
    .eq('id', id)
    .select()
    .single()
    .overrideTypes<DbClient, { merge: false }>();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteClient(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
}
