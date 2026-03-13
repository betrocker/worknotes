import { supabase } from '@/lib/supabase';

export type PaymentRow = {
  id: string;
  amount: number | null;
  payment_date: string | null;
  note: string | null;
};

export type ExpenseRow = {
  id: string;
  amount: number | null;
  title: string | null;
  created_at: string | null;
};

export async function listPayments(jobId: string): Promise<PaymentRow[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('id,amount,payment_date,note')
    .eq('job_id', jobId)
    .order('payment_date', { ascending: false })
    .overrideTypes<PaymentRow[], { merge: false }>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listExpenses(jobId: string): Promise<ExpenseRow[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('id,amount,title,created_at')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .overrideTypes<ExpenseRow[], { merge: false }>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPaymentById(id: string): Promise<PaymentRow | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('id,amount,payment_date,note')
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<PaymentRow, { merge: false }>();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function getExpenseById(id: string): Promise<ExpenseRow | null> {
  const { data, error } = await supabase
    .from('expenses')
    .select('id,amount,title,created_at')
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<ExpenseRow, { merge: false }>();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function createPayment(
  jobId: string,
  input: { amount: number; payment_date?: string | null; note?: string | null }
) {
  const payload = {
    job_id: jobId,
    amount: input.amount,
    payment_date: input.payment_date ?? null,
    note: input.note ?? null,
  };
  const { error } = await supabase.from('payments').insert(payload);
  if (error) throw new Error(error.message);
}

export async function createExpense(jobId: string, input: { amount: number; title?: string | null }) {
  const payload = {
    job_id: jobId,
    amount: input.amount,
    title: input.title ?? null,
  };
  const { error } = await supabase.from('expenses').insert(payload);
  if (error) throw new Error(error.message);
}

export async function updatePayment(
  id: string,
  input: { amount: number; payment_date?: string | null; note?: string | null }
): Promise<void> {
  const payload = {
    amount: input.amount,
    payment_date: input.payment_date ?? null,
    note: input.note ?? null,
  };
  const { error } = await supabase.from('payments').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateExpense(
  id: string,
  input: { amount: number; title?: string | null }
): Promise<void> {
  const payload = {
    amount: input.amount,
    title: input.title ?? null,
  };
  const { error } = await supabase.from('expenses').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
