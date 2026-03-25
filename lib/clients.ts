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
  address: string | null;
  note: string | null;
  created_at: string | null;
  jobs: Array<{
    id: string;
    title: string | null;
    price: number | null;
    status: string | null;
    scheduled_date: string | null;
    completed_at: string | null;
    created_at: string | null;
    payments: Array<{ amount: number | null }>;
  }>;
};

export type ClientWithDebt = {
  id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  note: string | null;
  created_at: string | null;
  jobs_count: number;
  active_jobs_count: number;
  debt: number;
  latest_active_job_id: string | null;
  latest_activity_at: string | null;
  top_debt_job_title: string | null;
};

type ClientDetailRow = {
  id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  note: string | null;
  created_at: string | null;
  jobs: Array<{
    id: string;
    title: string | null;
    price: number | null;
    status: string | null;
    scheduled_date: string | null;
    completed_at: string | null;
    created_at: string | null;
    payments: Array<{ id: string; amount: number | null; payment_date: string | null; note: string | null }>;
  }>;
};

export type ClientDetailJob = {
  id: string;
  title: string | null;
  price: number | null;
  status: string | null;
  scheduled_date: string | null;
  completed_at: string | null;
  created_at: string | null;
  paid: number;
  debt: number;
  payments: Array<{ id: string; amount: number | null; payment_date: string | null; note: string | null }>;
};

export type ClientDetail = {
  id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  note: string | null;
  created_at: string | null;
  jobs: ClientDetailJob[];
  total_paid: number;
  total_debt: number;
};

export type ClientOpenDebtJob = {
  id: string;
  title: string | null;
  status: string | null;
  scheduled_date: string | null;
  debt: number;
};

export function getOpenDebtJobsFromDetail(client: ClientDetail | null): ClientOpenDebtJob[] {
  if (!client) return [];

  return [...client.jobs]
    .filter((job) => job.debt > 0)
    .sort((a, b) => {
      if (b.debt !== a.debt) return b.debt - a.debt;
      const aTime = new Date(a.scheduled_date ?? a.created_at ?? 0).getTime();
      const bTime = new Date(b.scheduled_date ?? b.created_at ?? 0).getTime();
      return bTime - aTime;
    })
    .map((job) => ({
      id: job.id,
      title: job.title,
      status: job.status,
      scheduled_date: job.scheduled_date,
      debt: job.debt,
    }));
}

export async function listClientsWithDebt(userId: string): Promise<ClientWithDebt[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id,name,phone,address,note,created_at,jobs:jobs(id,title,price,status,scheduled_date,completed_at,created_at,payments(amount))')
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
    const activeJobsList = client.jobs.filter((job) => (job.status ?? '').toLowerCase() !== 'done');
    const activeJobs = activeJobsList.length;
    const latestActiveJob = [...activeJobsList].sort((a, b) => {
      const aDate = new Date(a.scheduled_date ?? a.created_at ?? 0).getTime();
      const bDate = new Date(b.scheduled_date ?? b.created_at ?? 0).getTime();
      return bDate - aDate;
    })[0];
    const topDebtJob = [...client.jobs]
      .map((job) => {
        const paid = (job.payments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);
        return {
          title: job.title,
          debt: Math.max(0, (job.price ?? 0) - paid),
          scheduled_date: job.scheduled_date,
          created_at: job.created_at,
        };
      })
      .filter((job) => job.debt > 0)
      .sort((a, b) => {
        if (b.debt !== a.debt) return b.debt - a.debt;
        const aDate = new Date(a.scheduled_date ?? a.created_at ?? 0).getTime();
        const bDate = new Date(b.scheduled_date ?? b.created_at ?? 0).getTime();
        return bDate - aDate;
      })[0];
    const latestActivityAt = [...client.jobs]
      .map((job) => job.completed_at ?? job.scheduled_date ?? job.created_at)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? client.created_at ?? null;
    return {
      id: client.id,
      name: client.name,
      phone: client.phone,
      address: client.address,
      note: client.note,
      created_at: client.created_at,
      jobs_count: client.jobs.length,
      active_jobs_count: activeJobs,
      debt,
      latest_active_job_id: latestActiveJob?.id ?? null,
      latest_activity_at: latestActivityAt,
      top_debt_job_title: topDebtJob?.title ?? null,
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

export async function getClientDetail(userId: string, id: string): Promise<ClientDetail | null> {
  const { data, error } = await supabase
    .from('clients')
    .select(
      'id,name,phone,address,note,created_at,jobs(id,title,price,status,scheduled_date,completed_at,created_at,payments(id,amount,payment_date,note))'
    )
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<ClientDetailRow, { merge: false }>();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const jobs = (data.jobs ?? []).map((job) => {
    const paid = (job.payments ?? []).reduce((sum, payment) => sum + (payment.amount ?? 0), 0);
    const debt = Math.max(0, (job.price ?? 0) - paid);
    return {
      id: job.id,
      title: job.title,
      price: job.price,
      status: job.status,
      scheduled_date: job.scheduled_date,
      completed_at: job.completed_at,
      created_at: job.created_at,
      paid,
      debt,
      payments: job.payments ?? [],
    };
  });

  const totalPaid = jobs.reduce((sum, job) => sum + job.paid, 0);
  const totalDebt = jobs.reduce((sum, job) => sum + job.debt, 0);

  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    address: data.address,
    note: data.note,
    created_at: data.created_at,
    jobs,
    total_paid: totalPaid,
    total_debt: totalDebt,
  };
}

export async function listClientOpenDebtJobs(userId: string, id: string): Promise<ClientOpenDebtJob[]> {
  const client = await getClientDetail(userId, id);
  return getOpenDebtJobsFromDetail(client);
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
