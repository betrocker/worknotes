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

function toMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function buildPayload(input: JobInvoiceItemInput) {
  const quantity = toMoney(input.quantity);
  const unitPrice = toMoney(input.unit_price);

  return {
    title: input.title.trim(),
    unit: input.unit?.trim() || null,
    quantity,
    unit_price: unitPrice,
    total: toMoney(quantity * unitPrice),
  };
}

async function syncJobPrice(jobId: string) {
  const { data, error } = await supabase
    .from('job_invoice_items')
    .select('total')
    .eq('job_id', jobId)
    .overrideTypes<Array<{ total: number | null }>, { merge: false }>();

  if (error) throw new Error(error.message);

  const nextPrice = (data ?? []).reduce((sum, item) => sum + (item.total ?? 0), 0);
  const normalizedPrice = data && data.length > 0 ? toMoney(nextPrice) : null;

  const { error: updateError } = await supabase.from('jobs').update({ price: normalizedPrice }).eq('id', jobId);
  if (updateError) throw new Error(updateError.message);
}

async function getNextPosition(jobId: string) {
  const { data, error } = await supabase
    .from('job_invoice_items')
    .select('position')
    .eq('job_id', jobId)
    .order('position', { ascending: false })
    .limit(1)
    .overrideTypes<Array<{ position: number | null }>, { merge: false }>();

  if (error) throw new Error(error.message);
  return (data?.[0]?.position ?? 0) + 1;
}

export async function listJobInvoiceItems(jobId: string): Promise<JobInvoiceItemRow[]> {
  const { data, error } = await supabase
    .from('job_invoice_items')
    .select('id,job_id,user_id,title,unit,quantity,unit_price,total,position,created_at')
    .eq('job_id', jobId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
    .overrideTypes<JobInvoiceItemRow[], { merge: false }>();

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createJobInvoiceItem(userId: string, jobId: string, input: JobInvoiceItemInput): Promise<void> {
  const payload = buildPayload(input);
  const position = await getNextPosition(jobId);

  const { error } = await supabase.from('job_invoice_items').insert({
    user_id: userId,
    job_id: jobId,
    position,
    ...payload,
  });

  if (error) throw new Error(error.message);
  await syncJobPrice(jobId);
}

export async function updateJobInvoiceItem(id: string, jobId: string, input: JobInvoiceItemInput): Promise<void> {
  const payload = buildPayload(input);

  const { error } = await supabase.from('job_invoice_items').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
  await syncJobPrice(jobId);
}

export async function deleteJobInvoiceItem(id: string, jobId: string): Promise<void> {
  const { error } = await supabase.from('job_invoice_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await syncJobPrice(jobId);
}
