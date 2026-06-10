import { supabase, type DbClient } from '@/lib/supabase';
import {
  countLocalClients,
  createLocalClient,
  deleteLocalClient,
  isLocalClientDeleted,
  getLocalClientById,
  getLocalClientDetail,
  listLocalDeletedClientIds,
  listLocalDeletedJobIds,
  listLocalClientDetails,
  listLocalClients,
  updateLocalClient,
} from '@/lib/offline/core-data';

export type ClientInput = {
  name: string;
  phone?: string | null;
  address?: string | null;
  note?: string | null;
};

export async function listClients(userId: string): Promise<DbClient[]> {
  try {
    const [remoteResult, localClients, deletedLocalIds] = await Promise.all([
      supabase
        .from('clients')
        .select()
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .overrideTypes<DbClient[], { merge: false }>(),
      listLocalClients(userId),
      listLocalDeletedClientIds(userId),
    ]);

    if (remoteResult.error) throw new Error(remoteResult.error.message);
    return mergeById(remoteResult.data ?? [], localClients as DbClient[], deletedLocalIds).sort(
      (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    );
  } catch (error) {
    const localClients = await listLocalClients(userId);
    return localClients as DbClient[];
  }
}

export async function countClients(userId: string): Promise<number> {
  try {
    const [remoteResult, localCount, deletedLocalIds] = await Promise.all([
      supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .overrideTypes<{ id: string }[], { merge: false }>(),
      countLocalClients(userId),
      listLocalDeletedClientIds(userId),
    ]);

    if (remoteResult.error) throw new Error(remoteResult.error.message);
    const deletedIds = new Set(deletedLocalIds);
    const remoteCount = (remoteResult.data ?? []).filter((row) => !deletedIds.has(row.id)).length;
    return Math.max(remoteCount, localCount);
  } catch (error) {
    return countLocalClients(userId);
  }
}

type ClientDebtRow = {
  id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  note: string | null;
  created_at: string | null;
  jobs: {
    id: string;
    title: string | null;
    price: number | null;
    status: string | null;
    scheduled_date: string | null;
    completed_at: string | null;
    created_at: string | null;
    payments: { amount: number | null }[];
  }[];
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
  debt_jobs_count: number;
};

type ClientDetailRow = {
  id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  note: string | null;
  created_at: string | null;
  jobs: {
    id: string;
    title: string | null;
    price: number | null;
    status: string | null;
    scheduled_date: string | null;
    completed_at: string | null;
    created_at: string | null;
    payments: { id: string; amount: number | null; payment_date: string | null; note: string | null }[];
  }[];
};

function getClientSortTime(client: Pick<ClientWithDebt, 'latest_activity_at' | 'created_at'>) {
  return new Date(client.latest_activity_at ?? client.created_at ?? 0).getTime();
}

function mergeById<T extends { id: string }>(remoteRows: T[], localRows: T[], deletedLocalIds: string[] = []) {
  const merged = new Map<string, T>();
  const deletedIds = new Set(deletedLocalIds);
  remoteRows.forEach((row) => {
    if (deletedIds.has(row.id)) return;
    merged.set(row.id, row);
  });
  localRows.forEach((row) => {
    merged.set(row.id, row);
  });
  return [...merged.values()];
}

function mapClientDebtRows(rows: ClientDebtRow[], deletedLocalJobIds: string[] = []): ClientWithDebt[] {
  const deletedJobIds = new Set(deletedLocalJobIds);
  return rows.map((client) => {
    const jobs = (client.jobs ?? []).filter((job) => !deletedJobIds.has(job.id));
    const debtJobs = jobs
      .map((job) => {
        const paid = (job.payments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);
        return {
          id: job.id,
          title: job.title,
          debt: Math.max(0, (job.price ?? 0) - paid),
          scheduled_date: job.scheduled_date,
          created_at: job.created_at,
        };
      })
      .filter((job) => job.debt > 0);
    const debt = debtJobs.reduce((sum, job) => sum + job.debt, 0);
    const activeJobsList = jobs.filter((job) => (job.status ?? '').toLowerCase() !== 'done');
    const activeJobs = activeJobsList.length;
    const latestActiveJob = [...activeJobsList].sort((a, b) => {
      const aDate = new Date(a.scheduled_date ?? a.created_at ?? 0).getTime();
      const bDate = new Date(b.scheduled_date ?? b.created_at ?? 0).getTime();
      return bDate - aDate;
    })[0];
    const topDebtJob = [...debtJobs]
      .sort((a, b) => {
        if (b.debt !== a.debt) return b.debt - a.debt;
        const aDate = new Date(a.scheduled_date ?? a.created_at ?? 0).getTime();
        const bDate = new Date(b.scheduled_date ?? b.created_at ?? 0).getTime();
        return bDate - aDate;
      })[0];
    const debtJobsCount = debtJobs.length;
    const latestActivityAt = [...jobs]
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
      jobs_count: jobs.length,
      active_jobs_count: activeJobs,
      debt,
      latest_active_job_id: latestActiveJob?.id ?? null,
      latest_activity_at: latestActivityAt,
      top_debt_job_title: topDebtJob?.title ?? null,
      debt_jobs_count: debtJobsCount,
    };
  });
}

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
  payments: { id: string; amount: number | null; payment_date: string | null; note: string | null }[];
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
  try {
    const [remoteResult, localRows, deletedLocalClientIds, deletedLocalJobIds] = await Promise.all([
      supabase
        .from('clients')
        .select('id,name,phone,address,note,created_at,jobs:jobs(id,title,price,status,scheduled_date,completed_at,created_at,payments(amount))')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .overrideTypes<ClientDebtRow[], { merge: false }>(),
      listLocalClientDetails(userId),
      listLocalDeletedClientIds(userId),
      listLocalDeletedJobIds(userId),
    ]);

    if (remoteResult.error) throw new Error(remoteResult.error.message);
    return mergeById(mapClientDebtRows(remoteResult.data ?? [], deletedLocalJobIds), localRows, deletedLocalClientIds).sort(
      (a, b) => getClientSortTime(b) - getClientSortTime(a)
    );
  } catch (error) {
    return listLocalClientDetails(userId);
  }
}

export async function getClientById(userId: string, id: string): Promise<DbClient | null> {
  try {
    if (await isLocalClientDeleted(userId, id)) return null;
    const { data, error } = await supabase
      .from('clients')
      .select()
      .eq('user_id', userId)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
      .overrideTypes<DbClient, { merge: false }>();

    if (error) throw new Error(error.message);
    return data ?? null;
  } catch (error) {
    return (await getLocalClientById(userId, id)) as DbClient | null;
  }
}

export async function getClientDetail(userId: string, id: string): Promise<ClientDetail | null> {
  let data: ClientDetailRow | null;
  try {
    if (await isLocalClientDeleted(userId, id)) return null;
    const response = await supabase
      .from('clients')
      .select(
        'id,name,phone,address,note,created_at,jobs(id,title,price,status,scheduled_date,completed_at,created_at,payments(id,amount,payment_date,note))'
      )
      .eq('user_id', userId)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
      .overrideTypes<ClientDetailRow, { merge: false }>();

    if (response.error) throw new Error(response.error.message);
    data = response.data ?? null;
  } catch (error) {
    return getLocalClientDetail(userId, id);
  }

  if (!data) return null;

  const deletedJobIds = new Set(await listLocalDeletedJobIds(userId));
  const jobs = (data.jobs ?? []).filter((job) => !deletedJobIds.has(job.id)).map((job) => {
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
  return (await createLocalClient({
    userId,
    name: input.name,
    phone: input.phone ?? null,
    address: input.address ?? null,
    note: input.note ?? null,
  })) as DbClient;
}

export async function updateClient(userId: string, id: string, input: ClientInput): Promise<DbClient> {
  return (await updateLocalClient(userId, id, {
    name: input.name,
    phone: input.phone ?? null,
    address: input.address ?? null,
    note: input.note ?? null,
  })) as DbClient;
}

export async function deleteClient(userId: string, id: string): Promise<void> {
  await deleteLocalClient(userId, id);
}
