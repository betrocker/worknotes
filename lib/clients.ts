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

type ClientDebtRow = {
  id: string;
  name: string | null;
  phone: string | null;
  note: string | null;
  jobs: Array<{
    price: number | null;
    payments: Array<{ amount: number | null }>;
  }>;
};

export type ClientWithDebt = {
  id: string;
  name: string | null;
  phone: string | null;
  note: string | null;
  debt: number;
};

export async function listClientsWithDebt(userId: string): Promise<ClientWithDebt[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id,name,phone,note,jobs:jobs(price,payments(amount))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .overrideTypes<ClientDebtRow[], { merge: false }>();

  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return rows.map((client) => {
    const totals = client.jobs.reduce(
      (acc, job) => {
        acc.totalPrice += job.price ?? 0;
        acc.totalPaid += (job.payments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);
        return acc;
      },
      { totalPrice: 0, totalPaid: 0 }
    );
    const debt = Math.max(0, totals.totalPrice - totals.totalPaid);
    return {
      id: client.id,
      name: client.name,
      phone: client.phone,
      note: client.note,
      debt,
    };
  });
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
