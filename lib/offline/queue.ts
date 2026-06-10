import { getOfflineDatabase } from '@/lib/offline/database';
import { notifyOfflineSyncNeeded } from '@/lib/offline/events';

export type SyncOperation = {
  id: number;
  table_name: string;
  row_id: string;
  operation: 'upsert' | 'delete' | 'upload_file';
  payload: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type SyncOperationInput = {
  tableName: string;
  rowId: string;
  operation: SyncOperation['operation'];
  payload?: Record<string, unknown>;
};

export async function enqueueSyncOperation(input: SyncOperationInput): Promise<void> {
  const db = await getOfflineDatabase();
  await db.runAsync(
    `
    INSERT INTO sync_operations (table_name, row_id, operation, payload, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    `,
    input.tableName,
    input.rowId,
    input.operation,
    JSON.stringify(input.payload ?? {})
  );
  notifyOfflineSyncNeeded();
}

export async function getPendingSyncOperations(limit = 50): Promise<SyncOperation[]> {
  const db = await getOfflineDatabase();
  return db.getAllAsync<SyncOperation>(
    `
    SELECT id, table_name, row_id, operation, payload, attempts, last_error, created_at, updated_at
    FROM sync_operations
    ORDER BY datetime(created_at) ASC, id ASC
    LIMIT ?
    `,
    limit
  );
}

export async function getPendingSyncOperationCount(): Promise<number> {
  const db = await getOfflineDatabase();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM sync_operations');
  return row?.count ?? 0;
}

export async function markSyncOperationDone(id: number): Promise<void> {
  const db = await getOfflineDatabase();
  await db.runAsync('DELETE FROM sync_operations WHERE id = ?', id);
}

export async function markSyncOperationFailed(id: number, error: string): Promise<void> {
  const db = await getOfflineDatabase();
  await db.runAsync(
    `
    UPDATE sync_operations
    SET attempts = attempts + 1,
        last_error = ?,
        updated_at = datetime('now')
    WHERE id = ?
    `,
    error,
    id
  );
}
