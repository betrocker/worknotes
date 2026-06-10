import { getOfflineDatabase } from '@/lib/offline/database';
import { enqueueSyncOperation } from '@/lib/offline/queue';
import type { ClientDetail, ClientWithDebt } from '@/lib/clients';
import type { JobImageKind, JobImageRow } from '@/lib/job-images';
import type { InvoiceRecord } from '@/lib/invoices';
import type { JobInvoiceItemInput, JobInvoiceItemRow } from '@/lib/job-invoice-items';
import type { JobDetail, JobListItem } from '@/lib/jobs';
import type { ExpenseRow, PaymentRow } from '@/lib/job-finance';

type LocalClientRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  phone: string | null;
  address: string | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

type LocalJobRow = {
  id: string;
  user_id: string | null;
  client_id: string | null;
  title: string | null;
  description: string | null;
  pending_reason: string | null;
  price: number | null;
  status: string | null;
  scheduled_date: string | null;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  client_name?: string | null;
  client_phone?: string | null;
  client_address?: string | null;
};

type LocalPaymentRow = {
  id: string;
  user_id: string | null;
  job_id: string | null;
  amount: number | null;
  payment_date: string | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

type LocalExpenseRow = {
  id: string;
  user_id: string | null;
  job_id: string | null;
  title: string | null;
  amount: number | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

type LocalJobInvoiceItemRow = {
  id: string;
  user_id: string | null;
  job_id: string | null;
  title: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
  position: number | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

type LocalJobImageRow = {
  id: string;
  user_id: string | null;
  job_id: string | null;
  kind: JobImageKind | null;
  image_url: string | null;
  storage_path: string | null;
  local_uri: string | null;
  upload_status: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

type LocalInvoiceRow = {
  id: string;
  user_id: string | null;
  job_id: string | null;
  invoice_number: string | null;
  sequence_number: number | null;
  year: number | null;
  issued_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

type RemoteClientRow = Partial<LocalClientRow> & { id: string };
type RemoteJobRow = Partial<LocalJobRow> & { id: string };
type RemotePaymentRow = Partial<LocalPaymentRow> & { id: string };
type RemoteExpenseRow = Partial<LocalExpenseRow> & { id: string };
type RemoteJobInvoiceItemRow = Partial<LocalJobInvoiceItemRow> & { id: string };
type RemoteJobImageRow = Partial<LocalJobImageRow> & { id: string };
type RemoteInvoiceRow = Partial<LocalInvoiceRow> & { id: string };

const nowIso = () => new Date().toISOString();
const toMoney = (value: number) => Math.round(value * 100) / 100;

export function createLocalId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const next = char === 'x' ? value : (value & 0x3) | 0x8;
    return next.toString(16);
  });
}

function coerceTimestamp(value: string | null | undefined, fallback?: string | null) {
  return value ?? fallback ?? nowIso();
}

async function getLocalJobOwner(jobId: string): Promise<{ user_id: string | null } | null> {
  const db = await getOfflineDatabase();
  return db.getFirstAsync<{ user_id: string | null }>('SELECT user_id FROM jobs WHERE id = ?', jobId);
}

function buildInvoiceItemPayload(input: JobInvoiceItemInput) {
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

function buildInvoiceNumber(sequence: number, year: number) {
  const yearShort = String(year).slice(-2);
  return `${String(sequence).padStart(3, '0')}/${yearShort}`;
}

function toInvoiceRecord(row: LocalInvoiceRow): InvoiceRecord {
  return {
    id: row.id,
    user_id: row.user_id,
    job_id: row.job_id,
    invoice_number: row.invoice_number ?? '',
    sequence_number: row.sequence_number ?? 0,
    year: row.year ?? new Date().getFullYear(),
    issued_at: row.issued_at ?? nowIso().slice(0, 10),
    created_at: row.created_at,
  };
}

export async function createLocalClient(input: {
  userId: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  note?: string | null;
}): Promise<LocalClientRow> {
  const db = await getOfflineDatabase();
  const timestamp = nowIso();
  const row: LocalClientRow = {
    id: createLocalId(),
    user_id: input.userId,
    name: input.name,
    phone: input.phone ?? null,
    address: input.address ?? null,
    note: input.note ?? null,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  };

  await db.runAsync(
    `
    INSERT INTO clients (id, user_id, name, phone, address, note, created_at, updated_at, deleted_at, dirty, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, 'pending')
    `,
    row.id,
    row.user_id,
    row.name,
    row.phone,
    row.address,
    row.note,
    row.created_at,
    row.updated_at
  );
  await enqueueSyncOperation({ tableName: 'clients', rowId: row.id, operation: 'upsert', payload: row });
  return row;
}

export async function updateLocalClient(
  userId: string,
  id: string,
  input: { name: string; phone?: string | null; address?: string | null; note?: string | null }
): Promise<LocalClientRow> {
  const db = await getOfflineDatabase();
  const existing = await getLocalClientById(userId, id);
  if (!existing) throw new Error('Client not found');
  const timestamp = nowIso();
  const row: LocalClientRow = {
    ...existing,
    name: input.name,
    phone: input.phone ?? null,
    address: input.address ?? null,
    note: input.note ?? null,
    updated_at: timestamp,
    deleted_at: null,
  };

  await db.runAsync(
    `
    UPDATE clients
    SET name = ?, phone = ?, address = ?, note = ?, updated_at = ?, deleted_at = NULL, dirty = 1, sync_status = 'pending'
    WHERE id = ? AND user_id = ?
    `,
    row.name,
    row.phone,
    row.address,
    row.note,
    row.updated_at,
    id,
    userId
  );
  await enqueueSyncOperation({ tableName: 'clients', rowId: id, operation: 'upsert', payload: row });
  return row;
}

export async function deleteLocalClient(userId: string, id: string): Promise<void> {
  const db = await getOfflineDatabase();
  const timestamp = nowIso();
  const jobs = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM jobs WHERE client_id = ? AND user_id = ? AND deleted_at IS NULL',
    id,
    userId
  );

  await db.runAsync(
    "UPDATE clients SET deleted_at = ?, updated_at = ?, dirty = 1, sync_status = 'pending' WHERE id = ?",
    timestamp,
    timestamp,
    id
  );
  await enqueueSyncOperation({ tableName: 'clients', rowId: id, operation: 'delete', payload: { id, user_id: userId, deleted_at: timestamp } });

  for (const job of jobs) {
    await deleteLocalJobCascade(userId, job.id, timestamp);
  }
}

export async function createLocalJob(input: {
  userId: string;
  client_id?: string | null;
  title: string;
  description?: string | null;
  pending_reason?: string | null;
  price?: number | null;
  status?: string | null;
  scheduled_date?: string | null;
  completed_at?: string | null;
}): Promise<{ id: string }> {
  const db = await getOfflineDatabase();
  const timestamp = nowIso();
  const status = input.status ?? null;
  const row: LocalJobRow = {
    id: createLocalId(),
    user_id: input.userId,
    client_id: input.client_id ?? null,
    title: input.title,
    description: input.description ?? null,
    pending_reason: status === 'pending' ? input.pending_reason ?? null : null,
    price: input.price ?? null,
    status,
    scheduled_date: input.scheduled_date ?? null,
    completed_at: input.completed_at ?? null,
    archived_at: null,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  };

  await db.runAsync(
    `
    INSERT INTO jobs (
      id, user_id, client_id, title, description, pending_reason, price, status,
      scheduled_date, completed_at, archived_at, created_at, updated_at, deleted_at, dirty, sync_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, 1, 'pending')
    `,
    row.id,
    row.user_id,
    row.client_id,
    row.title,
    row.description,
    row.pending_reason,
    row.price,
    row.status,
    row.scheduled_date,
    row.completed_at,
    row.created_at,
    row.updated_at
  );
  await enqueueSyncOperation({ tableName: 'jobs', rowId: row.id, operation: 'upsert', payload: row });
  return { id: row.id };
}

export async function updateLocalJob(
  userId: string,
  id: string,
  input: {
    client_id?: string | null;
    title: string;
    description?: string | null;
    pending_reason?: string | null;
    price?: number | null;
    status?: string | null;
    scheduled_date?: string | null;
    completed_at?: string | null;
    archived_at?: string | null;
  }
): Promise<void> {
  const db = await getOfflineDatabase();
  const existing = await getLocalJobById(userId, id);
  if (!existing) throw new Error('Job not found');
  const timestamp = nowIso();
  const row = {
    id,
    user_id: userId,
    client_id: input.client_id ?? null,
    title: input.title,
    description: input.description ?? null,
    pending_reason: input.status === 'pending' ? input.pending_reason ?? null : null,
    price: input.price ?? null,
    status: input.status ?? null,
    scheduled_date: input.scheduled_date ?? null,
    completed_at: input.completed_at ?? null,
    archived_at: input.archived_at ?? existing.archived_at ?? null,
    created_at: null,
    updated_at: timestamp,
    deleted_at: null,
  };

  await db.runAsync(
    `
    UPDATE jobs
    SET client_id = ?, title = ?, description = ?, pending_reason = ?, price = ?, status = ?,
        scheduled_date = ?, completed_at = ?, archived_at = ?, updated_at = ?, deleted_at = NULL,
        dirty = 1, sync_status = 'pending'
    WHERE id = ? AND user_id = ?
    `,
    row.client_id,
    row.title,
    row.description,
    row.pending_reason,
    row.price,
    row.status,
    row.scheduled_date,
    row.completed_at,
    row.archived_at,
    row.updated_at,
    id,
    userId
  );

  const updated = await getLocalJobRawById(userId, id);
  await enqueueSyncOperation({ tableName: 'jobs', rowId: id, operation: 'upsert', payload: updated ?? row });
}

export async function patchLocalJob(
  userId: string,
  id: string,
  patch: Partial<Pick<LocalJobRow, 'status' | 'completed_at' | 'scheduled_date' | 'archived_at'>>
): Promise<void> {
  const db = await getOfflineDatabase();
  const existing = await getLocalJobRawById(userId, id);
  if (!existing) throw new Error('Job not found');
  const timestamp = nowIso();
  const row = {
    ...existing,
    ...patch,
    updated_at: timestamp,
    deleted_at: null,
  };

  await db.runAsync(
    `
    UPDATE jobs
    SET status = ?, completed_at = ?, scheduled_date = ?, archived_at = ?, updated_at = ?, deleted_at = NULL,
        dirty = 1, sync_status = 'pending'
    WHERE id = ? AND user_id = ?
    `,
    row.status,
    row.completed_at,
    row.scheduled_date,
    row.archived_at,
    timestamp,
    id,
    userId
  );
  await enqueueSyncOperation({ tableName: 'jobs', rowId: id, operation: 'upsert', payload: row });
}

async function deleteLocalJobCascade(userId: string, id: string, timestamp: string): Promise<void> {
  const db = await getOfflineDatabase();
  const payments = await db.getAllAsync<{ id: string; user_id: string | null }>(
    'SELECT id, user_id FROM payments WHERE job_id = ? AND deleted_at IS NULL',
    id
  );
  const expenses = await db.getAllAsync<{ id: string; user_id: string | null }>(
    'SELECT id, user_id FROM expenses WHERE job_id = ? AND deleted_at IS NULL',
    id
  );
  const invoiceItems = await db.getAllAsync<{ id: string; user_id: string | null }>(
    'SELECT id, user_id FROM job_invoice_items WHERE job_id = ? AND deleted_at IS NULL',
    id
  );
  const images = await db.getAllAsync<{ id: string; user_id: string | null; storage_path: string | null }>(
    'SELECT id, user_id, storage_path FROM job_images WHERE job_id = ? AND deleted_at IS NULL',
    id
  );
  const invoices = await db.getAllAsync<{ id: string; user_id: string | null }>(
    'SELECT id, user_id FROM invoices WHERE job_id = ? AND deleted_at IS NULL',
    id
  );

  await db.runAsync(
    "UPDATE jobs SET deleted_at = ?, updated_at = ?, dirty = 1, sync_status = 'pending' WHERE id = ?",
    timestamp,
    timestamp,
    id
  );
  await enqueueSyncOperation({ tableName: 'jobs', rowId: id, operation: 'delete', payload: { id, user_id: userId, deleted_at: timestamp } });

  await db.runAsync(
    "UPDATE payments SET deleted_at = ?, updated_at = ?, dirty = 1, sync_status = 'pending' WHERE job_id = ? AND deleted_at IS NULL",
    timestamp,
    timestamp,
    id
  );
  for (const payment of payments) {
    await enqueueSyncOperation({
      tableName: 'payments',
      rowId: payment.id,
      operation: 'delete',
      payload: { id: payment.id, user_id: payment.user_id ?? userId, deleted_at: timestamp },
    });
  }

  await db.runAsync(
    "UPDATE expenses SET deleted_at = ?, updated_at = ?, dirty = 1, sync_status = 'pending' WHERE job_id = ? AND deleted_at IS NULL",
    timestamp,
    timestamp,
    id
  );
  for (const expense of expenses) {
    await enqueueSyncOperation({
      tableName: 'expenses',
      rowId: expense.id,
      operation: 'delete',
      payload: { id: expense.id, user_id: expense.user_id ?? userId, deleted_at: timestamp },
    });
  }

  await db.runAsync(
    "UPDATE job_invoice_items SET deleted_at = ?, updated_at = ?, dirty = 1, sync_status = 'pending' WHERE job_id = ? AND deleted_at IS NULL",
    timestamp,
    timestamp,
    id
  );
  for (const item of invoiceItems) {
    await enqueueSyncOperation({
      tableName: 'job_invoice_items',
      rowId: item.id,
      operation: 'delete',
      payload: { id: item.id, user_id: item.user_id ?? userId, deleted_at: timestamp },
    });
  }

  await db.runAsync(
    "UPDATE job_images SET deleted_at = ?, updated_at = ?, dirty = 1, sync_status = 'pending' WHERE job_id = ? AND deleted_at IS NULL",
    timestamp,
    timestamp,
    id
  );
  for (const image of images) {
    await enqueueSyncOperation({
      tableName: 'job_images',
      rowId: image.id,
      operation: 'delete',
      payload: { id: image.id, user_id: image.user_id ?? userId, storage_path: image.storage_path, deleted_at: timestamp },
    });
  }

  await db.runAsync(
    "UPDATE invoices SET deleted_at = ?, updated_at = ?, dirty = 1, sync_status = 'pending' WHERE job_id = ? AND deleted_at IS NULL",
    timestamp,
    timestamp,
    id
  );
  for (const invoice of invoices) {
    await enqueueSyncOperation({
      tableName: 'invoices',
      rowId: invoice.id,
      operation: 'delete',
      payload: { id: invoice.id, user_id: invoice.user_id ?? userId, deleted_at: timestamp },
    });
  }
}

export async function deleteLocalJob(userId: string, id: string): Promise<void> {
  await deleteLocalJobCascade(userId, id, nowIso());
}

export async function createLocalPayment(
  jobId: string,
  input: { amount: number; payment_date?: string | null; note?: string | null }
): Promise<void> {
  const owner = await getLocalJobOwner(jobId);
  if (!owner?.user_id) throw new Error('Job not found');
  const db = await getOfflineDatabase();
  const timestamp = nowIso();
  const row = {
    id: createLocalId(),
    user_id: owner.user_id,
    job_id: jobId,
    amount: input.amount,
    payment_date: input.payment_date ?? null,
    note: input.note ?? null,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  };

  await db.runAsync(
    `
    INSERT INTO payments (id, user_id, job_id, amount, payment_date, note, created_at, updated_at, deleted_at, dirty, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, 'pending')
    `,
    row.id,
    row.user_id,
    row.job_id,
    row.amount,
    row.payment_date,
    row.note,
    row.created_at,
    row.updated_at
  );
  await enqueueSyncOperation({ tableName: 'payments', rowId: row.id, operation: 'upsert', payload: row });
}

export async function updateLocalPayment(
  id: string,
  input: { amount: number; payment_date?: string | null; note?: string | null }
): Promise<void> {
  const db = await getOfflineDatabase();
  const existing = await db.getFirstAsync<LocalPaymentRow>('SELECT * FROM payments WHERE id = ? AND deleted_at IS NULL', id);
  if (!existing) throw new Error('Payment not found');
  const timestamp = nowIso();
  const row = {
    ...existing,
    amount: input.amount,
    payment_date: input.payment_date ?? null,
    note: input.note ?? null,
    updated_at: timestamp,
  };
  await db.runAsync(
    "UPDATE payments SET amount = ?, payment_date = ?, note = ?, updated_at = ?, dirty = 1, sync_status = 'pending' WHERE id = ?",
    row.amount,
    row.payment_date,
    row.note,
    row.updated_at,
    id
  );
  await enqueueSyncOperation({ tableName: 'payments', rowId: id, operation: 'upsert', payload: row });
}

export async function deleteLocalPayment(id: string): Promise<void> {
  const db = await getOfflineDatabase();
  const existing = await db.getFirstAsync<LocalPaymentRow>('SELECT * FROM payments WHERE id = ?', id);
  if (!existing) return;
  const timestamp = nowIso();
  await db.runAsync("UPDATE payments SET deleted_at = ?, updated_at = ?, dirty = 1, sync_status = 'pending' WHERE id = ?", timestamp, timestamp, id);
  await enqueueSyncOperation({ tableName: 'payments', rowId: id, operation: 'delete', payload: { id, user_id: existing.user_id, deleted_at: timestamp } });
}

export async function createLocalExpense(jobId: string, input: { amount: number; title?: string | null }): Promise<void> {
  const owner = await getLocalJobOwner(jobId);
  if (!owner?.user_id) throw new Error('Job not found');
  const db = await getOfflineDatabase();
  const timestamp = nowIso();
  const row = {
    id: createLocalId(),
    user_id: owner.user_id,
    job_id: jobId,
    title: input.title ?? null,
    amount: input.amount,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  };

  await db.runAsync(
    `
    INSERT INTO expenses (id, user_id, job_id, title, amount, created_at, updated_at, deleted_at, dirty, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 1, 'pending')
    `,
    row.id,
    row.user_id,
    row.job_id,
    row.title,
    row.amount,
    row.created_at,
    row.updated_at
  );
  await enqueueSyncOperation({ tableName: 'expenses', rowId: row.id, operation: 'upsert', payload: row });
}

export async function updateLocalExpense(id: string, input: { amount: number; title?: string | null }): Promise<void> {
  const db = await getOfflineDatabase();
  const existing = await db.getFirstAsync<LocalExpenseRow>('SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL', id);
  if (!existing) throw new Error('Expense not found');
  const timestamp = nowIso();
  const row = {
    ...existing,
    amount: input.amount,
    title: input.title ?? null,
    updated_at: timestamp,
  };
  await db.runAsync(
    "UPDATE expenses SET amount = ?, title = ?, updated_at = ?, dirty = 1, sync_status = 'pending' WHERE id = ?",
    row.amount,
    row.title,
    row.updated_at,
    id
  );
  await enqueueSyncOperation({ tableName: 'expenses', rowId: id, operation: 'upsert', payload: row });
}

export async function deleteLocalExpense(id: string): Promise<void> {
  const db = await getOfflineDatabase();
  const existing = await db.getFirstAsync<LocalExpenseRow>('SELECT * FROM expenses WHERE id = ?', id);
  if (!existing) return;
  const timestamp = nowIso();
  await db.runAsync("UPDATE expenses SET deleted_at = ?, updated_at = ?, dirty = 1, sync_status = 'pending' WHERE id = ?", timestamp, timestamp, id);
  await enqueueSyncOperation({ tableName: 'expenses', rowId: id, operation: 'delete', payload: { id, user_id: existing.user_id, deleted_at: timestamp } });
}

async function getNewLocalInvoiceItemPosition(jobId: string) {
  const db = await getOfflineDatabase();
  const row = await db.getFirstAsync<{ position: number | null }>(
    `
    SELECT position
    FROM job_invoice_items
    WHERE job_id = ? AND deleted_at IS NULL
    ORDER BY position ASC
    LIMIT 1
    `,
    jobId
  );
  return row?.position == null ? 1 : row.position - 1;
}

async function syncLocalJobPriceFromInvoiceItems(jobId: string): Promise<void> {
  const owner = await getLocalJobOwner(jobId);
  if (!owner?.user_id) throw new Error('Job not found');

  const db = await getOfflineDatabase();
  const row = await db.getFirstAsync<{ total: number | null; count: number }>(
    `
    SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS count
    FROM job_invoice_items
    WHERE job_id = ? AND deleted_at IS NULL
    `,
    jobId
  );
  const nextPrice = row && row.count > 0 ? toMoney(row.total ?? 0) : null;
  const timestamp = nowIso();

  await db.runAsync(
    "UPDATE jobs SET price = ?, updated_at = ?, dirty = 1, sync_status = 'pending' WHERE id = ? AND user_id = ?",
    nextPrice,
    timestamp,
    jobId,
    owner.user_id
  );

  const job = await getLocalJobRawById(owner.user_id, jobId);
  if (job) {
    await enqueueSyncOperation({ tableName: 'jobs', rowId: jobId, operation: 'upsert', payload: job });
  }
}

export async function createLocalJobInvoiceItem(userId: string, jobId: string, input: JobInvoiceItemInput): Promise<void> {
  const db = await getOfflineDatabase();
  const timestamp = nowIso();
  const payload = buildInvoiceItemPayload(input);
  const position = await getNewLocalInvoiceItemPosition(jobId);
  const row: LocalJobInvoiceItemRow = {
    id: createLocalId(),
    user_id: userId,
    job_id: jobId,
    position,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
    ...payload,
  };

  await db.runAsync(
    `
    INSERT INTO job_invoice_items (
      id, user_id, job_id, title, unit, quantity, unit_price, total, position, created_at, updated_at, deleted_at, dirty, sync_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, 'pending')
    `,
    row.id,
    row.user_id,
    row.job_id,
    row.title,
    row.unit,
    row.quantity,
    row.unit_price,
    row.total,
    row.position,
    row.created_at,
    row.updated_at
  );

  await enqueueSyncOperation({ tableName: 'job_invoice_items', rowId: row.id, operation: 'upsert', payload: row });
  await syncLocalJobPriceFromInvoiceItems(jobId);
}

export async function updateLocalJobInvoiceItem(id: string, jobId: string, input: JobInvoiceItemInput): Promise<void> {
  const db = await getOfflineDatabase();
  const existing = await db.getFirstAsync<LocalJobInvoiceItemRow>('SELECT * FROM job_invoice_items WHERE id = ? AND deleted_at IS NULL', id);
  if (!existing) throw new Error('Invoice item not found');
  const timestamp = nowIso();
  const payload = buildInvoiceItemPayload(input);
  const row: LocalJobInvoiceItemRow = {
    ...existing,
    ...payload,
    updated_at: timestamp,
    deleted_at: null,
  };

  await db.runAsync(
    `
    UPDATE job_invoice_items
    SET title = ?, unit = ?, quantity = ?, unit_price = ?, total = ?, updated_at = ?, deleted_at = NULL, dirty = 1, sync_status = 'pending'
    WHERE id = ?
    `,
    row.title,
    row.unit,
    row.quantity,
    row.unit_price,
    row.total,
    row.updated_at,
    id
  );

  await enqueueSyncOperation({ tableName: 'job_invoice_items', rowId: id, operation: 'upsert', payload: row });
  await syncLocalJobPriceFromInvoiceItems(jobId);
}

export async function deleteLocalJobInvoiceItem(id: string, jobId: string): Promise<void> {
  const db = await getOfflineDatabase();
  const existing = await db.getFirstAsync<LocalJobInvoiceItemRow>('SELECT * FROM job_invoice_items WHERE id = ?', id);
  if (!existing) return;
  const timestamp = nowIso();

  await db.runAsync(
    "UPDATE job_invoice_items SET deleted_at = ?, updated_at = ?, dirty = 1, sync_status = 'pending' WHERE id = ?",
    timestamp,
    timestamp,
    id
  );

  await enqueueSyncOperation({
    tableName: 'job_invoice_items',
    rowId: id,
    operation: 'delete',
    payload: { id, user_id: existing.user_id, deleted_at: timestamp },
  });
  await syncLocalJobPriceFromInvoiceItems(jobId);
}

export async function createLocalJobImage(input: {
  userId: string;
  jobId: string;
  kind: JobImageKind;
  localUri: string;
  storagePath: string;
  contentType: string;
}): Promise<JobImageRow> {
  const db = await getOfflineDatabase();
  const timestamp = nowIso();
  const row: LocalJobImageRow = {
    id: createLocalId(),
    user_id: input.userId,
    job_id: input.jobId,
    kind: input.kind,
    image_url: null,
    storage_path: input.storagePath,
    local_uri: input.localUri,
    upload_status: 'pending',
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  };

  await db.runAsync(
    `
    INSERT INTO job_images (
      id, user_id, job_id, kind, image_url, storage_path, local_uri, upload_status, created_at, updated_at, deleted_at, dirty, sync_status
    )
    VALUES (?, ?, ?, ?, NULL, ?, ?, 'pending', ?, ?, NULL, 1, 'pending')
    `,
    row.id,
    row.user_id,
    row.job_id,
    row.kind,
    row.storage_path,
    row.local_uri,
    row.created_at,
    row.updated_at
  );

  await enqueueSyncOperation({
    tableName: 'job_images',
    rowId: row.id,
    operation: 'upload_file',
    payload: { ...row, content_type: input.contentType },
  });

  return row;
}

export async function deleteLocalJobImage(id: string, storagePath: string | null): Promise<void> {
  const db = await getOfflineDatabase();
  const existing = await db.getFirstAsync<LocalJobImageRow>('SELECT * FROM job_images WHERE id = ?', id);
  if (!existing) return;
  const timestamp = nowIso();

  await db.runAsync(
    "UPDATE job_images SET deleted_at = ?, updated_at = ?, dirty = 1, sync_status = 'pending' WHERE id = ?",
    timestamp,
    timestamp,
    id
  );

  await enqueueSyncOperation({
    tableName: 'job_images',
    rowId: id,
    operation: 'delete',
    payload: { id, user_id: existing.user_id, storage_path: storagePath ?? existing.storage_path, deleted_at: timestamp },
  });
}

export async function getLocalJobImageSyncRow(id: string): Promise<LocalJobImageRow | null> {
  const db = await getOfflineDatabase();
  return db.getFirstAsync<LocalJobImageRow>('SELECT * FROM job_images WHERE id = ?', id);
}

export async function markLocalJobImageUploaded(id: string, imageUrl: string, storagePath: string): Promise<void> {
  const db = await getOfflineDatabase();
  const timestamp = nowIso();
  await db.runAsync(
    `
    UPDATE job_images
    SET image_url = ?, storage_path = ?, upload_status = 'synced', updated_at = ?, dirty = 0, sync_status = 'synced'
    WHERE id = ?
    `,
    imageUrl,
    storagePath,
    timestamp,
    id
  );
}

export async function getOrCreateLocalInvoiceForJob(userId: string, jobId: string): Promise<InvoiceRecord> {
  const db = await getOfflineDatabase();
  const existing = await db.getFirstAsync<LocalInvoiceRow>(
    'SELECT * FROM invoices WHERE user_id = ? AND job_id = ? AND deleted_at IS NULL',
    userId,
    jobId
  );
  if (existing) return toInvoiceRecord(existing);

  const year = new Date().getFullYear();
  const sequenceRow = await db.getFirstAsync<{ sequence_number: number | null }>(
    'SELECT MAX(sequence_number) AS sequence_number FROM invoices WHERE user_id = ? AND year = ? AND deleted_at IS NULL',
    userId,
    year
  );
  const sequence = (sequenceRow?.sequence_number ?? 0) + 1;
  const timestamp = nowIso();
  const row: LocalInvoiceRow = {
    id: createLocalId(),
    user_id: userId,
    job_id: jobId,
    invoice_number: buildInvoiceNumber(sequence, year),
    sequence_number: sequence,
    year,
    issued_at: timestamp.slice(0, 10),
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  };

  await db.runAsync(
    `
    INSERT INTO invoices (
      id, user_id, job_id, invoice_number, sequence_number, year, issued_at, created_at, updated_at, deleted_at, dirty, sync_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, 'pending')
    `,
    row.id,
    row.user_id,
    row.job_id,
    row.invoice_number,
    row.sequence_number,
    row.year,
    row.issued_at,
    row.created_at,
    row.updated_at
  );

  await enqueueSyncOperation({ tableName: 'invoices', rowId: row.id, operation: 'upsert', payload: row });
  return toInvoiceRecord(row);
}

export async function upsertRemoteClients(rows: RemoteClientRow[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await getOfflineDatabase();
  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      await db.runAsync(
        `
        INSERT INTO clients (id, user_id, name, phone, address, note, created_at, updated_at, deleted_at, dirty, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'synced')
        ON CONFLICT(id) DO UPDATE SET
          user_id = excluded.user_id,
          name = excluded.name,
          phone = excluded.phone,
          address = excluded.address,
          note = excluded.note,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at,
          dirty = 0,
          sync_status = 'synced'
        WHERE clients.dirty = 0
        `,
        row.id,
        row.user_id ?? null,
        row.name ?? null,
        row.phone ?? null,
        row.address ?? null,
        row.note ?? null,
        coerceTimestamp(row.created_at),
        coerceTimestamp(row.updated_at, row.created_at),
        row.deleted_at ?? null
      );
    }
  });
}

export async function upsertRemoteJobs(rows: RemoteJobRow[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await getOfflineDatabase();
  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      await db.runAsync(
        `
        INSERT INTO jobs (
          id, user_id, client_id, title, description, pending_reason, price, status,
          scheduled_date, completed_at, archived_at, created_at, updated_at, deleted_at, dirty, sync_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'synced')
        ON CONFLICT(id) DO UPDATE SET
          user_id = excluded.user_id,
          client_id = excluded.client_id,
          title = excluded.title,
          description = excluded.description,
          pending_reason = excluded.pending_reason,
          price = excluded.price,
          status = excluded.status,
          scheduled_date = excluded.scheduled_date,
          completed_at = excluded.completed_at,
          archived_at = excluded.archived_at,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at,
          dirty = 0,
          sync_status = 'synced'
        WHERE jobs.dirty = 0
        `,
        row.id,
        row.user_id ?? null,
        row.client_id ?? null,
        row.title ?? null,
        row.description ?? null,
        row.pending_reason ?? null,
        row.price ?? null,
        row.status ?? null,
        row.scheduled_date ?? null,
        row.completed_at ?? null,
        row.archived_at ?? null,
        coerceTimestamp(row.created_at),
        coerceTimestamp(row.updated_at, row.created_at),
        row.deleted_at ?? null
      );
    }
  });
}

export async function upsertRemotePayments(rows: RemotePaymentRow[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await getOfflineDatabase();
  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      await db.runAsync(
        `
        INSERT INTO payments (id, user_id, job_id, amount, payment_date, note, created_at, updated_at, deleted_at, dirty, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'synced')
        ON CONFLICT(id) DO UPDATE SET
          user_id = excluded.user_id,
          job_id = excluded.job_id,
          amount = excluded.amount,
          payment_date = excluded.payment_date,
          note = excluded.note,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at,
          dirty = 0,
          sync_status = 'synced'
        WHERE payments.dirty = 0
        `,
        row.id,
        row.user_id ?? null,
        row.job_id ?? null,
        row.amount ?? null,
        row.payment_date ?? null,
        row.note ?? null,
        coerceTimestamp(row.created_at, row.payment_date),
        coerceTimestamp(row.updated_at, row.payment_date),
        row.deleted_at ?? null
      );
    }
  });
}

export async function upsertRemoteExpenses(rows: RemoteExpenseRow[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await getOfflineDatabase();
  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      await db.runAsync(
        `
        INSERT INTO expenses (id, user_id, job_id, title, amount, created_at, updated_at, deleted_at, dirty, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'synced')
        ON CONFLICT(id) DO UPDATE SET
          user_id = excluded.user_id,
          job_id = excluded.job_id,
          title = excluded.title,
          amount = excluded.amount,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at,
          dirty = 0,
          sync_status = 'synced'
        WHERE expenses.dirty = 0
        `,
        row.id,
        row.user_id ?? null,
        row.job_id ?? null,
        row.title ?? null,
        row.amount ?? null,
        coerceTimestamp(row.created_at),
        coerceTimestamp(row.updated_at, row.created_at),
        row.deleted_at ?? null
      );
    }
  });
}

export async function upsertRemoteJobInvoiceItems(rows: RemoteJobInvoiceItemRow[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await getOfflineDatabase();
  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      await db.runAsync(
        `
        INSERT INTO job_invoice_items (
          id, user_id, job_id, title, unit, quantity, unit_price, total, position, created_at, updated_at, deleted_at, dirty, sync_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'synced')
        ON CONFLICT(id) DO UPDATE SET
          user_id = excluded.user_id,
          job_id = excluded.job_id,
          title = excluded.title,
          unit = excluded.unit,
          quantity = excluded.quantity,
          unit_price = excluded.unit_price,
          total = excluded.total,
          position = excluded.position,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at,
          dirty = 0,
          sync_status = 'synced'
        WHERE job_invoice_items.dirty = 0
        `,
        row.id,
        row.user_id ?? null,
        row.job_id ?? null,
        row.title ?? null,
        row.unit ?? null,
        row.quantity ?? null,
        row.unit_price ?? null,
        row.total ?? null,
        row.position ?? null,
        coerceTimestamp(row.created_at),
        coerceTimestamp(row.updated_at, row.created_at),
        row.deleted_at ?? null
      );
    }
  });
}

export async function upsertRemoteJobImages(rows: RemoteJobImageRow[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await getOfflineDatabase();
  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      await db.runAsync(
        `
        INSERT INTO job_images (
          id, user_id, job_id, kind, image_url, storage_path, local_uri, upload_status, created_at, updated_at, deleted_at, dirty, sync_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'synced')
        ON CONFLICT(id) DO UPDATE SET
          user_id = excluded.user_id,
          job_id = excluded.job_id,
          kind = excluded.kind,
          image_url = excluded.image_url,
          storage_path = excluded.storage_path,
          local_uri = excluded.local_uri,
          upload_status = excluded.upload_status,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at,
          dirty = 0,
          sync_status = 'synced'
        WHERE job_images.dirty = 0
        `,
        row.id,
        row.user_id ?? null,
        row.job_id ?? null,
        row.kind ?? null,
        row.image_url ?? null,
        row.storage_path ?? null,
        row.local_uri ?? null,
        row.upload_status ?? 'synced',
        coerceTimestamp(row.created_at),
        coerceTimestamp(row.updated_at, row.created_at),
        row.deleted_at ?? null
      );
    }
  });
}

export async function upsertRemoteInvoices(rows: RemoteInvoiceRow[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await getOfflineDatabase();
  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      await db.runAsync(
        `
        INSERT INTO invoices (
          id, user_id, job_id, invoice_number, sequence_number, year, issued_at, created_at, updated_at, deleted_at, dirty, sync_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'synced')
        ON CONFLICT(id) DO UPDATE SET
          user_id = excluded.user_id,
          job_id = excluded.job_id,
          invoice_number = excluded.invoice_number,
          sequence_number = excluded.sequence_number,
          year = excluded.year,
          issued_at = excluded.issued_at,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at,
          dirty = 0,
          sync_status = 'synced'
        WHERE invoices.dirty = 0
        `,
        row.id,
        row.user_id ?? null,
        row.job_id ?? null,
        row.invoice_number ?? null,
        row.sequence_number ?? null,
        row.year ?? null,
        row.issued_at ?? null,
        coerceTimestamp(row.created_at, row.issued_at),
        coerceTimestamp(row.updated_at, row.created_at ?? row.issued_at),
        row.deleted_at ?? null
      );
    }
  });
}

async function getLocalPaymentsByJobIds(jobIds: string[]): Promise<Map<string, LocalPaymentRow[]>> {
  const grouped = new Map<string, LocalPaymentRow[]>();
  if (jobIds.length === 0) return grouped;

  const db = await getOfflineDatabase();
  const placeholders = jobIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<LocalPaymentRow>(
    `
    SELECT id, user_id, job_id, amount, payment_date, note, created_at, updated_at, deleted_at
    FROM payments
    WHERE deleted_at IS NULL AND job_id IN (${placeholders})
    `,
    jobIds
  );

  rows.forEach((row) => {
    if (!row.job_id) return;
    grouped.set(row.job_id, [...(grouped.get(row.job_id) ?? []), row]);
  });

  return grouped;
}

export async function listLocalClients(userId: string): Promise<LocalClientRow[]> {
  const db = await getOfflineDatabase();
  return db.getAllAsync<LocalClientRow>(
    `
    SELECT id, user_id, name, phone, address, note, created_at, updated_at, deleted_at
    FROM clients
    WHERE user_id = ? AND deleted_at IS NULL
    ORDER BY datetime(created_at) DESC
    `,
    userId
  );
}

export async function countLocalClients(userId: string): Promise<number> {
  const db = await getOfflineDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM clients WHERE user_id = ? AND deleted_at IS NULL',
    userId
  );
  return row?.count ?? 0;
}

export async function listLocalDeletedClientIds(userId: string): Promise<string[]> {
  const db = await getOfflineDatabase();
  const rows = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM clients WHERE user_id = ? AND deleted_at IS NOT NULL',
    userId
  );
  return rows.map((row) => row.id);
}

export async function isLocalClientDeleted(userId: string, id: string): Promise<boolean> {
  const db = await getOfflineDatabase();
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM clients WHERE user_id = ? AND id = ? AND deleted_at IS NOT NULL',
    userId,
    id
  );
  return Boolean(row);
}

export async function getLocalClientById(userId: string, id: string): Promise<LocalClientRow | null> {
  const db = await getOfflineDatabase();
  return db.getFirstAsync<LocalClientRow>(
    `
    SELECT id, user_id, name, phone, address, note, created_at, updated_at, deleted_at
    FROM clients
    WHERE user_id = ? AND id = ? AND deleted_at IS NULL
    `,
    userId,
    id
  );
}

export async function listLocalClientDetails(userId: string): Promise<ClientWithDebt[]> {
  const [clients, jobs] = await Promise.all([listLocalClients(userId), listLocalJobs(userId, { includeArchived: true })]);
  const jobsByClient = new Map<string, JobListItem[]>();

  jobs.forEach((job) => {
    if (!job.client_id) return;
    jobsByClient.set(job.client_id, [...(jobsByClient.get(job.client_id) ?? []), job]);
  });

  return clients.map((client) => {
    const clientJobs = jobsByClient.get(client.id) ?? [];
    const debtJobs = clientJobs
      .map((job) => ({
        id: job.id,
        title: job.title,
        debt: job.debt,
        scheduled_date: job.scheduled_date,
        created_at: job.created_at,
      }))
      .filter((job) => job.debt > 0);
    const activeJobsList = clientJobs.filter((job) => (job.status ?? '').toLowerCase() !== 'done');
    const latestActiveJob = [...activeJobsList].sort((a, b) => {
      const aDate = new Date(a.scheduled_date ?? a.created_at ?? 0).getTime();
      const bDate = new Date(b.scheduled_date ?? b.created_at ?? 0).getTime();
      return bDate - aDate;
    })[0];
    const topDebtJob = [...debtJobs].sort((a, b) => {
      if (b.debt !== a.debt) return b.debt - a.debt;
      const aDate = new Date(a.scheduled_date ?? a.created_at ?? 0).getTime();
      const bDate = new Date(b.scheduled_date ?? b.created_at ?? 0).getTime();
      return bDate - aDate;
    })[0];
    const latestActivityAt =
      [...clientJobs]
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
      jobs_count: clientJobs.length,
      active_jobs_count: activeJobsList.length,
      debt: debtJobs.reduce((sum, job) => sum + job.debt, 0),
      latest_active_job_id: latestActiveJob?.id ?? null,
      latest_activity_at: latestActivityAt,
      top_debt_job_title: topDebtJob?.title ?? null,
      debt_jobs_count: debtJobs.length,
    };
  });
}

export type ListLocalJobsOptions = {
  includeArchived?: boolean;
};

export async function listLocalJobs(userId: string, options: ListLocalJobsOptions = {}): Promise<(JobListItem & { client_id: string | null })[]> {
  const db = await getOfflineDatabase();
  const rows = await db.getAllAsync<LocalJobRow>(
    `
    SELECT
      jobs.id, jobs.user_id, jobs.client_id, jobs.title, jobs.description, jobs.pending_reason,
      jobs.price, jobs.status, jobs.scheduled_date, jobs.completed_at, jobs.archived_at,
      jobs.created_at, jobs.updated_at, jobs.deleted_at,
      clients.name AS client_name
    FROM jobs
    LEFT JOIN clients ON clients.id = jobs.client_id AND clients.deleted_at IS NULL
    WHERE jobs.user_id = ? AND jobs.deleted_at IS NULL
    ORDER BY datetime(jobs.created_at) DESC
    `,
    userId
  );
  const paymentsByJob = await getLocalPaymentsByJobIds(rows.map((row) => row.id));

  const jobs = rows.map((row) => {
    const paid = (paymentsByJob.get(row.id) ?? []).reduce((sum, payment) => sum + (payment.amount ?? 0), 0);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      pending_reason: row.pending_reason,
      price: row.price,
      debt: Math.max(0, (row.price ?? 0) - paid),
      status: row.status,
      scheduled_date: row.scheduled_date,
      completed_at: row.completed_at,
      archived_at: row.archived_at,
      created_at: row.created_at,
      client_id: row.client_id,
      client: { name: row.client_name ?? null },
    };
  });

  return options.includeArchived ? jobs : jobs.filter((job) => job.archived_at == null);
}

export async function countLocalJobs(userId: string): Promise<number> {
  const db = await getOfflineDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM jobs WHERE user_id = ? AND deleted_at IS NULL',
    userId
  );
  return row?.count ?? 0;
}

export async function listLocalDeletedJobIds(userId: string): Promise<string[]> {
  const db = await getOfflineDatabase();
  const rows = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM jobs WHERE user_id = ? AND deleted_at IS NOT NULL',
    userId
  );
  return rows.map((row) => row.id);
}

export async function isLocalJobDeleted(userId: string, id: string): Promise<boolean> {
  const db = await getOfflineDatabase();
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM jobs WHERE user_id = ? AND id = ? AND deleted_at IS NOT NULL',
    userId,
    id
  );
  return Boolean(row);
}

export async function getLocalJobById(userId: string, id: string): Promise<JobDetail | null> {
  const db = await getOfflineDatabase();
  const row = await db.getFirstAsync<LocalJobRow>(
    `
    SELECT
      jobs.id, jobs.user_id, jobs.client_id, jobs.title, jobs.description, jobs.pending_reason,
      jobs.price, jobs.status, jobs.scheduled_date, jobs.completed_at, jobs.archived_at,
      jobs.created_at, jobs.updated_at, jobs.deleted_at,
      clients.name AS client_name, clients.phone AS client_phone, clients.address AS client_address
    FROM jobs
    LEFT JOIN clients ON clients.id = jobs.client_id AND clients.deleted_at IS NULL
    WHERE jobs.user_id = ? AND jobs.id = ? AND jobs.deleted_at IS NULL
    `,
    userId,
    id
  );

  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    pending_reason: row.pending_reason,
    price: row.price,
    status: row.status,
    scheduled_date: row.scheduled_date,
    completed_at: row.completed_at,
    archived_at: row.archived_at,
    client_id: row.client_id,
    client: row.client_id
      ? {
          name: row.client_name ?? null,
          phone: row.client_phone ?? null,
          address: row.client_address ?? null,
        }
      : null,
  };
}

async function getLocalJobRawById(userId: string, id: string): Promise<LocalJobRow | null> {
  const db = await getOfflineDatabase();
  return db.getFirstAsync<LocalJobRow>('SELECT * FROM jobs WHERE user_id = ? AND id = ?', userId, id);
}

export async function getLocalClientDetail(userId: string, id: string): Promise<ClientDetail | null> {
  const client = await getLocalClientById(userId, id);
  if (!client) return null;

  const jobs = (await listLocalJobs(userId, { includeArchived: true })).filter((job) => job.client_id === id);
  const paymentsByJob = await getLocalPaymentsByJobIds(jobs.map((job) => job.id));
  const detailJobs = jobs.map((job) => {
    const payments = (paymentsByJob.get(job.id) ?? []).map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      payment_date: payment.payment_date,
      note: payment.note,
    }));
    const paid = payments.reduce((sum, payment) => sum + (payment.amount ?? 0), 0);
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
      payments,
    };
  });

  return {
    id: client.id,
    name: client.name,
    phone: client.phone,
    address: client.address,
    note: client.note,
    created_at: client.created_at,
    jobs: detailJobs,
    total_paid: detailJobs.reduce((sum, job) => sum + job.paid, 0),
    total_debt: detailJobs.reduce((sum, job) => sum + job.debt, 0),
  };
}

export async function listLocalPayments(jobId: string): Promise<PaymentRow[]> {
  const db = await getOfflineDatabase();
  return db.getAllAsync<PaymentRow>(
    `
    SELECT id, amount, payment_date, note
    FROM payments
    WHERE job_id = ? AND deleted_at IS NULL
    ORDER BY datetime(payment_date) DESC
    `,
    jobId
  );
}

export async function listLocalExpenses(jobId: string): Promise<ExpenseRow[]> {
  const db = await getOfflineDatabase();
  return db.getAllAsync<ExpenseRow>(
    `
    SELECT id, amount, title, created_at
    FROM expenses
    WHERE job_id = ? AND deleted_at IS NULL
    ORDER BY datetime(created_at) DESC
    `,
    jobId
  );
}

export async function listLocalJobInvoiceItems(jobId: string): Promise<JobInvoiceItemRow[]> {
  const db = await getOfflineDatabase();
  return db.getAllAsync<JobInvoiceItemRow>(
    `
    SELECT id, job_id, user_id, title, unit, quantity, unit_price, total, position, created_at
    FROM job_invoice_items
    WHERE job_id = ? AND deleted_at IS NULL
    ORDER BY position ASC, datetime(created_at) ASC
    `,
    jobId
  );
}

export async function listLocalJobImages(jobId: string): Promise<JobImageRow[]> {
  const db = await getOfflineDatabase();
  return db.getAllAsync<JobImageRow>(
    `
    SELECT id, job_id, user_id, kind, image_url, storage_path, local_uri, upload_status, created_at
    FROM job_images
    WHERE job_id = ? AND deleted_at IS NULL
    ORDER BY datetime(created_at) ASC
    `,
    jobId
  );
}

export async function getLocalPaymentById(id: string): Promise<PaymentRow | null> {
  const db = await getOfflineDatabase();
  return db.getFirstAsync<PaymentRow>(
    'SELECT id, amount, payment_date, note FROM payments WHERE id = ? AND deleted_at IS NULL',
    id
  );
}

export async function getLocalExpenseById(id: string): Promise<ExpenseRow | null> {
  const db = await getOfflineDatabase();
  return db.getFirstAsync<ExpenseRow>(
    'SELECT id, amount, title, created_at FROM expenses WHERE id = ? AND deleted_at IS NULL',
    id
  );
}
