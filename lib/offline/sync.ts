import { getOfflineDatabase, markOfflineStoreReady, setSyncMeta } from '@/lib/offline/database';
import {
  getLocalJobImageSyncRow,
  markLocalJobImageUploaded,
  upsertRemoteClients,
  upsertRemoteExpenses,
  upsertRemoteInvoices,
  upsertRemoteJobImages,
  upsertRemoteJobInvoiceItems,
  upsertRemoteJobs,
  upsertRemotePayments,
} from '@/lib/offline/core-data';
import {
  getPendingSyncOperationCount,
  getPendingSyncOperations,
  markSyncOperationDone,
  markSyncOperationFailed,
  type SyncOperation,
} from '@/lib/offline/queue';
import { removeStoredJobImage, uploadPreparedJobImage } from '@/lib/job-image-storage';
import { supabase } from '@/lib/supabase';

export type OfflineSyncResult = {
  pendingOperations: number;
};

export async function initializeOfflineStore(): Promise<void> {
  await getOfflineDatabase();
  await markOfflineStoreReady();
}

const SYNC_TABLES = new Set(['clients', 'jobs', 'payments', 'expenses', 'job_invoice_items', 'job_images', 'invoices']);

function parseOperationPayload(operation: SyncOperation): Record<string, unknown> {
  try {
    return JSON.parse(operation.payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function pickPayload(payload: Record<string, unknown>, keys: string[]) {
  return keys.reduce<Record<string, unknown>>((next, key) => {
    if (key in payload) {
      next[key] = payload[key];
    }
    return next;
  }, {});
}

function sanitizeUpsertPayload(tableName: string, payload: Record<string, unknown>) {
  switch (tableName) {
    case 'clients':
      return pickPayload(payload, ['id', 'user_id', 'name', 'phone', 'address', 'note', 'created_at', 'updated_at', 'deleted_at']);
    case 'jobs':
      return pickPayload(payload, [
        'id',
        'user_id',
        'client_id',
        'title',
        'description',
        'pending_reason',
        'price',
        'status',
        'scheduled_date',
        'completed_at',
        'archived_at',
        'created_at',
        'updated_at',
        'deleted_at',
      ]);
    case 'payments':
      return pickPayload(payload, ['id', 'user_id', 'job_id', 'amount', 'payment_date', 'note', 'updated_at', 'deleted_at']);
    case 'expenses':
      return pickPayload(payload, ['id', 'user_id', 'job_id', 'title', 'amount', 'created_at', 'updated_at', 'deleted_at']);
    case 'job_invoice_items':
      return pickPayload(payload, [
        'id',
        'user_id',
        'job_id',
        'title',
        'unit',
        'quantity',
        'unit_price',
        'total',
        'position',
        'created_at',
        'updated_at',
        'deleted_at',
      ]);
    case 'job_images':
      return pickPayload(payload, [
        'id',
        'user_id',
        'job_id',
        'kind',
        'image_url',
        'storage_path',
        'local_uri',
        'upload_status',
        'created_at',
        'updated_at',
        'deleted_at',
      ]);
    case 'invoices':
      return pickPayload(payload, [
        'id',
        'user_id',
        'job_id',
        'invoice_number',
        'sequence_number',
        'year',
        'issued_at',
        'created_at',
        'updated_at',
        'deleted_at',
      ]);
    default:
      return payload;
  }
}

async function uploadJobImageOperation(operation: SyncOperation, payload: Record<string, unknown>): Promise<void> {
  const local = await getLocalJobImageSyncRow(operation.row_id);
  if (!local || local.deleted_at) {
    await markSyncOperationDone(operation.id);
    return;
  }

  if (!local.local_uri || !local.storage_path) {
    throw new Error('Missing local image file.');
  }

  const contentType = typeof payload.content_type === 'string' ? payload.content_type : 'image/jpeg';
  const publicUrl = await uploadPreparedJobImage({
    storagePath: local.storage_path,
    uri: local.local_uri,
    contentType,
  });
  const timestamp = new Date().toISOString();

  const { error } = await supabase.from('job_images').upsert({
    id: local.id,
    user_id: local.user_id,
    job_id: local.job_id,
    kind: local.kind,
    image_url: publicUrl,
    storage_path: local.storage_path,
    local_uri: local.local_uri,
    upload_status: 'synced',
    created_at: local.created_at,
    updated_at: timestamp,
    deleted_at: null,
  });

  if (error) throw new Error(error.message);

  await markLocalJobImageUploaded(local.id, publicUrl, local.storage_path);
  await markSyncOperationDone(operation.id);
}

async function markLocalRowSynced(tableName: string, rowId: string): Promise<void> {
  const db = await getOfflineDatabase();
  if (!SYNC_TABLES.has(tableName)) return;
  await db.runAsync(`UPDATE ${tableName} SET dirty = 0, sync_status = 'synced' WHERE id = ?`, rowId);
}

async function markLocalRowDeletedSynced(tableName: string, rowId: string, deletedAt: string): Promise<void> {
  const db = await getOfflineDatabase();
  if (!SYNC_TABLES.has(tableName)) return;
  await db.runAsync(
    `UPDATE ${tableName} SET deleted_at = ?, updated_at = ?, dirty = 0, sync_status = 'synced' WHERE id = ?`,
    deletedAt,
    deletedAt,
    rowId
  );
}

async function pushOneOperation(operation: SyncOperation): Promise<void> {
  if (!SYNC_TABLES.has(operation.table_name)) {
    await markSyncOperationDone(operation.id);
    return;
  }

  const payload = parseOperationPayload(operation);
  const table = operation.table_name;

  if (operation.operation === 'upload_file' && table === 'job_images') {
    await uploadJobImageOperation(operation, payload);
    return;
  }

  if (operation.operation === 'upsert') {
    const nextPayload = sanitizeUpsertPayload(table, payload);
    const { error } = await (supabase.from(table) as never as {
      upsert: (value: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    }).upsert(nextPayload);
    if (error) throw new Error(error.message);
  } else if (operation.operation === 'delete') {
    const deletedAt = typeof payload.deleted_at === 'string' ? payload.deleted_at : new Date().toISOString();
    const storagePath = typeof payload.storage_path === 'string' ? payload.storage_path : null;
    if (table === 'job_images' && storagePath) {
      await removeStoredJobImage(storagePath);
    }
    const { error } = await (supabase.from(table) as never as {
      update: (value: Record<string, unknown>) => {
        eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
      };
    }).update({ deleted_at: deletedAt, updated_at: deletedAt }).eq('id', operation.row_id);
    if (error) throw new Error(error.message);
    await markLocalRowDeletedSynced(table, operation.row_id, deletedAt);
    await markSyncOperationDone(operation.id);
    return;
  }

  await markLocalRowSynced(table, operation.row_id);
  await markSyncOperationDone(operation.id);
}

async function pushPendingOperations(): Promise<void> {
  let processedBatches = 0;

  while (processedBatches < 20) {
    const pending = await getPendingSyncOperations();
    if (pending.length === 0) return;

    for (const operation of pending) {
      try {
        await pushOneOperation(operation);
      } catch (error) {
        await markSyncOperationFailed(operation.id, error instanceof Error ? error.message : String(error));
        throw error;
      }
    }

    processedBatches += 1;
  }
}

async function pullCoreData(userId: string): Promise<void> {
  const [clients, jobs, payments, expenses, invoiceItems, jobImages, invoices] = await Promise.all([
    supabase
      .from('clients')
      .select('id,user_id,name,phone,address,note,created_at,updated_at,deleted_at')
      .eq('user_id', userId)
      .overrideTypes<
        {
          id: string;
          user_id: string | null;
          name: string | null;
          phone: string | null;
          address: string | null;
          note: string | null;
          created_at: string | null;
          updated_at: string | null;
          deleted_at: string | null;
        }[],
        { merge: false }
      >(),
    supabase
      .from('jobs')
      .select(
        'id,user_id,client_id,title,description,pending_reason,price,status,scheduled_date,completed_at,archived_at,created_at,updated_at,deleted_at'
      )
      .eq('user_id', userId)
      .overrideTypes<
        {
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
        }[],
        { merge: false }
      >(),
    supabase
      .from('payments')
      .select('id,user_id,job_id,amount,payment_date,note,updated_at,deleted_at')
      .eq('user_id', userId)
      .overrideTypes<
        {
          id: string;
          user_id: string | null;
          job_id: string | null;
          amount: number | null;
          payment_date: string | null;
          note: string | null;
          updated_at: string | null;
          deleted_at: string | null;
        }[],
        { merge: false }
      >(),
    supabase
      .from('expenses')
      .select('id,user_id,job_id,title,amount,created_at,updated_at,deleted_at')
      .eq('user_id', userId)
      .overrideTypes<
        {
          id: string;
          user_id: string | null;
          job_id: string | null;
          title: string | null;
          amount: number | null;
          created_at: string | null;
          updated_at: string | null;
          deleted_at: string | null;
        }[],
        { merge: false }
      >(),
    supabase
      .from('job_invoice_items')
      .select('id,user_id,job_id,title,unit,quantity,unit_price,total,position,created_at,updated_at,deleted_at')
      .eq('user_id', userId)
      .overrideTypes<
        {
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
        }[],
        { merge: false }
      >(),
    supabase
      .from('job_images')
      .select('id,user_id,job_id,kind,image_url,storage_path,local_uri,upload_status,created_at,updated_at,deleted_at')
      .eq('user_id', userId)
      .overrideTypes<
        {
          id: string;
          user_id: string | null;
          job_id: string | null;
          kind: 'before' | 'after' | null;
          image_url: string | null;
          storage_path: string | null;
          local_uri: string | null;
          upload_status: string | null;
          created_at: string | null;
          updated_at: string | null;
          deleted_at: string | null;
        }[],
        { merge: false }
      >(),
    supabase
      .from('invoices')
      .select('id,user_id,job_id,invoice_number,sequence_number,year,issued_at,created_at,updated_at,deleted_at')
      .eq('user_id', userId)
      .overrideTypes<
        {
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
        }[],
        { merge: false }
      >(),
  ]);

  if (clients.error) throw new Error(clients.error.message);
  if (jobs.error) throw new Error(jobs.error.message);
  if (payments.error) throw new Error(payments.error.message);
  if (expenses.error) throw new Error(expenses.error.message);
  if (invoiceItems.error) throw new Error(invoiceItems.error.message);
  if (jobImages.error) throw new Error(jobImages.error.message);
  if (invoices.error) throw new Error(invoices.error.message);

  await upsertRemoteClients(clients.data ?? []);
  await upsertRemoteJobs(jobs.data ?? []);
  await upsertRemotePayments(payments.data ?? []);
  await upsertRemoteExpenses(expenses.data ?? []);
  await upsertRemoteJobInvoiceItems(invoiceItems.data ?? []);
  await upsertRemoteJobImages(jobImages.data ?? []);
  await upsertRemoteInvoices(invoices.data ?? []);
}

export async function runOfflineSync(userId: string | null): Promise<OfflineSyncResult> {
  await initializeOfflineStore();
  await setSyncMeta('last_sync_attempt_at', new Date().toISOString());

  if (!userId) {
    return { pendingOperations: await getPendingSyncOperationCount() };
  }

  await pushPendingOperations();
  await pullCoreData(userId);

  await setSyncMeta('last_sync_pending_count', String(await getPendingSyncOperationCount()));
  await setSyncMeta('last_sync_finished_at', new Date().toISOString());

  return { pendingOperations: await getPendingSyncOperationCount() };
}
