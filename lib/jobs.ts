import { supabase } from '@/lib/supabase';
import {
  countLocalJobs,
  createLocalJob,
  deleteLocalJob,
  isLocalJobDeleted,
  getLocalJobById,
  listLocalDeletedJobIds,
  listLocalJobs,
  patchLocalJob,
  updateLocalJob,
} from '@/lib/offline/core-data';

const getLocalToday = () => {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export type JobListItem = {
  id: string;
  title: string | null;
  description: string | null;
  pending_reason: string | null;
  price: number | null;
  debt: number;
  status: string | null;
  scheduled_date: string | null;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string | null;
  client: { name: string | null } | null;
};

type JobListRow = Omit<JobListItem, 'debt'> & {
  payments: { amount: number | null }[] | null;
};

export type JobRecord = {
  id: string;
};

export type JobInput = {
  title: string;
  description?: string | null;
  pending_reason?: string | null;
  price?: number | null;
  status?: string | null;
  scheduled_date?: string | null;
  client_id?: string | null;
};

type JobStatusRow = {
  status: string | null;
  completed_at: string | null;
};

function getJobSortTime(job: Pick<JobListItem, 'scheduled_date' | 'created_at'>) {
  return new Date(job.scheduled_date ?? job.created_at ?? 0).getTime();
}

function mergeJobRows(
  remoteRows: JobListItem[],
  localRows: JobListItem[],
  deletedLocalIds: string[],
  options: ListJobsOptions
) {
  const merged = new Map<string, JobListItem>();
  const deletedIds = new Set(deletedLocalIds);

  remoteRows.forEach((job) => {
    if (deletedIds.has(job.id)) return;
    merged.set(job.id, job);
  });
  localRows.forEach((job) => {
    merged.set(job.id, job);
  });

  const rows = [...merged.values()].sort((a, b) => getJobSortTime(b) - getJobSortTime(a));
  return options.includeArchived ? rows : rows.filter((job) => job.archived_at == null);
}

async function resolveCompletedAt(
  userId: string,
  id: string,
  nextStatus: string | null
): Promise<string | null> {
  if (nextStatus !== 'done') return null;

  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('status,completed_at')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle()
      .overrideTypes<JobStatusRow, { merge: false }>();

    if (error) throw new Error(error.message);
    if (!data) return getLocalToday();
    if (data.status === 'done' && data.completed_at) return data.completed_at;
  } catch (error) {
    const local = await getLocalJobById(userId, id);
    if (local?.status === 'done' && local.completed_at) return local.completed_at;
  }
  return getLocalToday();
}

export async function listJobs(userId: string, options: ListJobsOptions = {}): Promise<JobListItem[]> {
  try {
    const [remoteResult, localRows, deletedLocalIds] = await Promise.all([
      supabase
        .from('jobs')
        .select('id,title,description,pending_reason,price,status,scheduled_date,completed_at,archived_at,created_at,client:clients(name),payments(amount)')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .overrideTypes<JobListRow[], { merge: false }>(),
      listLocalJobs(userId, { includeArchived: true }),
      listLocalDeletedJobIds(userId),
    ]);

    if (remoteResult.error) throw new Error(remoteResult.error.message);
    const remoteRows = (remoteResult.data ?? []).map((job) => {
      const paid = (job.payments ?? []).reduce((sum, payment) => sum + (payment.amount ?? 0), 0);
      const debt = Math.max(0, (job.price ?? 0) - paid);
      const { payments, ...rest } = job;
      return { ...rest, debt };
    });
    return mergeJobRows(remoteRows, localRows, deletedLocalIds, options);
  } catch (error) {
    return listLocalJobs(userId, options);
  }
}

export async function countJobs(userId: string): Promise<number> {
  try {
    const [remoteResult, localCount, deletedLocalIds] = await Promise.all([
      supabase
      .from('jobs')
        .select('id')
      .eq('user_id', userId)
        .is('deleted_at', null)
        .overrideTypes<{ id: string }[], { merge: false }>(),
      countLocalJobs(userId),
      listLocalDeletedJobIds(userId),
    ]);

    if (remoteResult.error) throw new Error(remoteResult.error.message);
    const deletedIds = new Set(deletedLocalIds);
    const remoteCount = (remoteResult.data ?? []).filter((row) => !deletedIds.has(row.id)).length;
    return Math.max(remoteCount, localCount);
  } catch (error) {
    return countLocalJobs(userId);
  }
}

export async function createJob(userId: string, input: JobInput): Promise<JobRecord> {
  const status = input.status ?? null;
  return createLocalJob({
    client_id: input.client_id ?? null,
    title: input.title,
    description: input.description ?? null,
    pending_reason: input.status === 'pending' ? input.pending_reason ?? null : null,
    price: input.price ?? null,
    status,
    scheduled_date: input.scheduled_date ?? null,
    completed_at: status === 'done' ? getLocalToday() : null,
    userId,
  });
}

export type JobDetail = {
  id: string;
  title: string | null;
  description: string | null;
  pending_reason: string | null;
  price: number | null;
  status: string | null;
  scheduled_date: string | null;
  completed_at: string | null;
  archived_at: string | null;
  client_id: string | null;
  client: { name: string | null; phone: string | null; address: string | null } | null;
};

type ListJobsOptions = {
  includeArchived?: boolean;
};

export async function getJobById(userId: string, id: string): Promise<JobDetail | null> {
  try {
    if (await isLocalJobDeleted(userId, id)) return null;
    const { data, error } = await supabase
      .from('jobs')
      .select('id,title,description,pending_reason,price,status,scheduled_date,completed_at,archived_at,client_id,client:clients(name,phone,address)')
      .eq('user_id', userId)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
      .overrideTypes<JobDetail, { merge: false }>();

    if (error) throw new Error(error.message);
    return data ?? null;
  } catch (error) {
    return getLocalJobById(userId, id);
  }
}

export async function updateJob(userId: string, id: string, input: JobInput): Promise<void> {
  const status = input.status ?? null;
  const completedAt = await resolveCompletedAt(userId, id, status);
  await updateLocalJob(userId, id, {
    client_id: input.client_id ?? null,
    title: input.title,
    description: input.description ?? null,
    pending_reason: status === 'pending' ? input.pending_reason ?? null : null,
    price: input.price ?? null,
    status,
    scheduled_date: input.scheduled_date ?? null,
    completed_at: completedAt,
  });
}

export async function updateJobStatus(userId: string, id: string, status: string | null): Promise<void> {
  const completedAt = await resolveCompletedAt(userId, id, status);
  await patchLocalJob(userId, id, { status, completed_at: completedAt });
}

export async function updateJobScheduledDate(userId: string, id: string, scheduledDate: string | null): Promise<void> {
  await patchLocalJob(userId, id, { scheduled_date: scheduledDate });
}

export async function deleteJob(userId: string, id: string): Promise<void> {
  await deleteLocalJob(userId, id);
}

export async function archiveJob(userId: string, id: string): Promise<void> {
  await patchLocalJob(userId, id, { archived_at: new Date().toISOString() });
}

export async function unarchiveJob(userId: string, id: string): Promise<void> {
  await patchLocalJob(userId, id, { archived_at: null });
}
