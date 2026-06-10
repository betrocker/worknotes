import { supabase } from '@/lib/supabase';
import {
  createLocalExpense,
  createLocalPayment,
  deleteLocalExpense,
  deleteLocalPayment,
  getLocalExpenseById,
  getLocalPaymentById,
  listLocalExpenses,
  listLocalPayments,
  updateLocalExpense,
  updateLocalPayment,
} from '@/lib/offline/core-data';

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

function mergeRowsById<T extends { id: string }>(remoteRows: T[], localRows: T[]) {
  const merged = new Map<string, T>();
  remoteRows.forEach((row) => {
    merged.set(row.id, row);
  });
  localRows.forEach((row) => {
    merged.set(row.id, row);
  });
  return [...merged.values()];
}

export async function listPayments(jobId: string): Promise<PaymentRow[]> {
  try {
    const [remoteResult, localRows] = await Promise.all([
      supabase
        .from('payments')
        .select('id,amount,payment_date,note')
        .eq('job_id', jobId)
        .is('deleted_at', null)
        .order('payment_date', { ascending: false })
        .overrideTypes<PaymentRow[], { merge: false }>(),
      listLocalPayments(jobId),
    ]);
    if (remoteResult.error) throw new Error(remoteResult.error.message);
    return mergeRowsById(remoteResult.data ?? [], localRows).sort(
      (a, b) => new Date(b.payment_date ?? 0).getTime() - new Date(a.payment_date ?? 0).getTime()
    );
  } catch (error) {
    return listLocalPayments(jobId);
  }
}

export async function listExpenses(jobId: string): Promise<ExpenseRow[]> {
  try {
    const [remoteResult, localRows] = await Promise.all([
      supabase
        .from('expenses')
        .select('id,amount,title,created_at')
        .eq('job_id', jobId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .overrideTypes<ExpenseRow[], { merge: false }>(),
      listLocalExpenses(jobId),
    ]);
    if (remoteResult.error) throw new Error(remoteResult.error.message);
    return mergeRowsById(remoteResult.data ?? [], localRows).sort(
      (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    );
  } catch (error) {
    return listLocalExpenses(jobId);
  }
}

export async function getPaymentById(id: string): Promise<PaymentRow | null> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('id,amount,payment_date,note')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
      .overrideTypes<PaymentRow, { merge: false }>();
    if (error) throw new Error(error.message);
    return data ?? null;
  } catch (error) {
    return getLocalPaymentById(id);
  }
}

export async function getExpenseById(id: string): Promise<ExpenseRow | null> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('id,amount,title,created_at')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
      .overrideTypes<ExpenseRow, { merge: false }>();
    if (error) throw new Error(error.message);
    return data ?? null;
  } catch (error) {
    return getLocalExpenseById(id);
  }
}

export async function createPayment(
  jobId: string,
  input: { amount: number; payment_date?: string | null; note?: string | null }
) {
  await createLocalPayment(jobId, input);
}

export async function createExpense(jobId: string, input: { amount: number; title?: string | null }) {
  await createLocalExpense(jobId, input);
}

export async function updatePayment(
  id: string,
  input: { amount: number; payment_date?: string | null; note?: string | null }
): Promise<void> {
  await updateLocalPayment(id, input);
}

export async function updateExpense(
  id: string,
  input: { amount: number; title?: string | null }
): Promise<void> {
  await updateLocalExpense(id, input);
}

export async function deletePayment(id: string): Promise<void> {
  await deleteLocalPayment(id);
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteLocalExpense(id);
}
