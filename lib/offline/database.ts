import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

import { OFFLINE_DB_VERSION, OFFLINE_SCHEMA_SQL } from '@/lib/offline/schema';

const OFFLINE_DB_NAME = 'etefter-offline.db';
const DB_VERSION_KEY = 'db_version';

let databasePromise: Promise<SQLiteDatabase> | null = null;

export async function getOfflineDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(OFFLINE_DB_NAME).then(async (db) => {
      await initializeOfflineDatabase(db);
      return db;
    });
  }

  return databasePromise;
}

export async function initializeOfflineDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(OFFLINE_SCHEMA_SQL);
  await db.runAsync(
    `
    INSERT INTO sync_meta (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `,
    DB_VERSION_KEY,
    String(OFFLINE_DB_VERSION)
  );
}

export async function setSyncMeta(key: string, value: string | null): Promise<void> {
  const db = await getOfflineDatabase();
  await db.runAsync(
    `
    INSERT INTO sync_meta (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `,
    key,
    value
  );
}

export async function getSyncMeta(key: string): Promise<string | null> {
  const db = await getOfflineDatabase();
  const row = await db.getFirstAsync<{ value: string | null }>('SELECT value FROM sync_meta WHERE key = ?', key);
  return row?.value ?? null;
}

export async function markOfflineStoreReady(): Promise<void> {
  await setSyncMeta('initialized_at', new Date().toISOString());
}
