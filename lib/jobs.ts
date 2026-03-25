import { supabase } from '@/lib/supabase';

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
  price: number | null;
  status: string | null;
  scheduled_date: string | null;
  completed_at: string | null;
  archived_at: string | null;
  client: { name: string | null } | null;
};

export type JobRecord = {
  id: string;
};

export type JobInput = {
  title: string;
  description?: string | null;
  price?: number | null;
  status?: string | null;
  scheduled_date?: string | null;
  client_id?: string | null;
};

type JobStatusRow = {
  status: string | null;
  completed_at: string | null;
};

async function resolveCompletedAt(
  userId: string,
  id: string,
  nextStatus: string | null
): Promise<string | null> {
  if (nextStatus !== 'done') return null;

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
  return getLocalToday();
}

export async function listJobs(userId: string, options: ListJobsOptions = {}): Promise<JobListItem[]> {
  let query = supabase
    .from('jobs')
    .select('id,title,description,price,status,scheduled_date,completed_at,archived_at,client:clients(name)')
    .eq('user_id', userId)
    .order('scheduled_date', { ascending: true })
    .order('created_at', { ascending: false })
    .overrideTypes<JobListItem[], { merge: false }>();

  if (!options.includeArchived) {
    query = query.is('archived_at', null);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createJob(userId: string, input: JobInput): Promise<JobRecord> {
  const status = input.status ?? null;
  const payload = {
    user_id: userId,
    client_id: input.client_id ?? null,
    title: input.title,
    description: input.description ?? null,
    price: input.price ?? null,
    status,
    scheduled_date: input.scheduled_date ?? null,
    completed_at: status === 'done' ? getLocalToday() : null,
  };

  const { data, error } = await supabase
    .from('jobs')
    .insert(payload)
    .select('id')
    .single()
    .overrideTypes<JobRecord, { merge: false }>();
  if (error) throw new Error(error.message);
  return data;
}

export type JobDetail = {
  id: string;
  title: string | null;
  description: string | null;
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
  const { data, error } = await supabase
    .from('jobs')
    .select('id,title,description,price,status,scheduled_date,completed_at,archived_at,client_id,client:clients(name,phone,address)')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<JobDetail, { merge: false }>();

  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function updateJob(userId: string, id: string, input: JobInput): Promise<void> {
  const status = input.status ?? null;
  const completedAt = await resolveCompletedAt(userId, id, status);
  const payload = {
    client_id: input.client_id ?? null,
    title: input.title,
    description: input.description ?? null,
    price: input.price ?? null,
    status,
    scheduled_date: input.scheduled_date ?? null,
    completed_at: completedAt,
  };

  const { error } = await supabase.from('jobs').update(payload).eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateJobStatus(userId: string, id: string, status: string | null): Promise<void> {
  const completedAt = await resolveCompletedAt(userId, id, status);
  const payload = {
    status,
    completed_at: completedAt,
  };
  const { error } = await supabase.from('jobs').update(payload).eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteJob(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('jobs').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function archiveJob(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .update({ archived_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id)
    .is('archived_at', null);
  if (error) throw new Error(error.message);
}

export async function unarchiveJob(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .update({ archived_at: null })
    .eq('user_id', userId)
    .eq('id', id);
  if (error) throw new Error(error.message);
}
