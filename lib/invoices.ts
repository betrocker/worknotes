import { supabase } from '@/lib/supabase';

export type InvoiceRecord = {
  id: string;
  user_id: string | null;
  job_id: string | null;
  invoice_number: string;
  sequence_number: number;
  year: number;
  issued_at: string;
  created_at: string | null;
};

function getCurrentYear() {
  return new Date().getFullYear();
}

function buildInvoiceNumber(sequence: number, year: number) {
  const yearShort = String(year).slice(-2);
  return `${String(sequence).padStart(3, '0')}/${yearShort}`;
}

export async function getOrCreateInvoiceForJob(userId: string, jobId: string): Promise<InvoiceRecord> {
  const { data: existing, error: existingError } = await supabase
    .from('invoices')
    .select('id,user_id,job_id,invoice_number,sequence_number,year,issued_at,created_at')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .maybeSingle()
    .overrideTypes<InvoiceRecord, { merge: false }>();

  if (existingError) throw new Error(existingError.message);
  if (existing) return existing;

  const year = getCurrentYear();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: rows, error: listError } = await supabase
      .from('invoices')
      .select('sequence_number')
      .eq('user_id', userId)
      .eq('year', year)
      .order('sequence_number', { ascending: false })
      .limit(1)
      .overrideTypes<Array<{ sequence_number: number }>, { merge: false }>();

    if (listError) throw new Error(listError.message);

    const nextSequence = (rows?.[0]?.sequence_number ?? 0) + 1;
    const invoiceNumber = buildInvoiceNumber(nextSequence, year);

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        job_id: jobId,
        invoice_number: invoiceNumber,
        sequence_number: nextSequence,
        year,
        issued_at: new Date().toISOString().slice(0, 10),
      })
      .select('id,user_id,job_id,invoice_number,sequence_number,year,issued_at,created_at')
      .single()
      .overrideTypes<InvoiceRecord, { merge: false }>();

    if (!error) return data;

    const message = error.message.toLowerCase();
    if (message.includes('duplicate') || message.includes('unique')) {
      continue;
    }
    throw new Error(error.message);
  }

  throw new Error('Unable to create invoice number.');
}
