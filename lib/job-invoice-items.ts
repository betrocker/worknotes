import {
  createLocalJobInvoiceItem,
  deleteLocalJobInvoiceItem,
  listLocalJobInvoiceItems,
  updateLocalJobInvoiceItem,
} from '@/lib/offline/core-data';
import { supabase } from '@/lib/supabase';

export type JobInvoiceItemRow = {
  id: string;
  job_id: string | null;
  user_id: string | null;
  title: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
  position: number | null;
  created_at: string | null;
};

export type JobInvoiceItemInput = {
  title: string;
  unit?: string | null;
  quantity: number;
  unit_price: number;
};

function mergeInvoiceItems(remoteRows: JobInvoiceItemRow[], localRows: JobInvoiceItemRow[]) {
  const merged = new Map<string, JobInvoiceItemRow>();
  remoteRows.forEach((row) => {
    merged.set(row.id, row);
  });
  localRows.forEach((row) => {
    merged.set(row.id, row);
  });
  return [...merged.values()].sort((a, b) => {
    const positionDiff = (a.position ?? 0) - (b.position ?? 0);
    if (positionDiff !== 0) return positionDiff;
    return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
  });
}

export async function listJobInvoiceItems(jobId: string): Promise<JobInvoiceItemRow[]> {
  const [remoteResult, localRows] = await Promise.all([
    supabase
      .from('job_invoice_items')
      .select('id,job_id,user_id,title,unit,quantity,unit_price,total,position,created_at')
      .eq('job_id', jobId)
      .is('deleted_at', null)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
      .overrideTypes<JobInvoiceItemRow[], { merge: false }>(),
    listLocalJobInvoiceItems(jobId),
  ]);

  if (remoteResult.error) return localRows;
  return mergeInvoiceItems(remoteResult.data ?? [], localRows);
}

export async function createJobInvoiceItem(userId: string, jobId: string, input: JobInvoiceItemInput): Promise<void> {
  await createLocalJobInvoiceItem(userId, jobId, input);
}

export async function updateJobInvoiceItem(id: string, jobId: string, input: JobInvoiceItemInput): Promise<void> {
  await updateLocalJobInvoiceItem(id, jobId, input);
}

export async function deleteJobInvoiceItem(id: string, jobId: string): Promise<void> {
  await deleteLocalJobInvoiceItem(id, jobId);
}
