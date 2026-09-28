import { openDB, DBSchema, IDBPDatabase } from "idb";

export interface SyncQueueItem {
  operationId: string;
  recordId: string;
  clientId: string;
  userId: string;
  operationType: "CREATE" | "UPDATE" | "DELETE";
  entity: "TRANSACTION" | "ACCOUNT" | "BUDGET";
  payload: any;
  retryCount: number;
  status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED" | "CONFLICT";
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface FinanceDBSchema extends DBSchema {
  transactions: {
    key: string;
    value: {
      id: string;
      clientId?: string;
      userId: string;
      type: "EXPENSE" | "INCOME" | "TRANSFER";
      amount: number;
      currency: string;
      accountId: string;
      sourceAccountId?: string;
      destinationAccountId?: string;
      categoryId?: string;
      merchant?: string;
      description?: string;
      note?: string;
      date: string;
      syncStatus: "SYNCED" | "PENDING" | "FAILED";
      createdAt: string;
      updatedAt: string;
    };
    indexes: { "by-syncStatus": string; "by-clientId": string };
  };
  accounts: {
    key: string;
    value: {
      id: string;
      name: string;
      type: string;
      currentBalance: number;
      currency: string;
      isDefault: boolean;
      updatedAt: string;
    };
  };
  sync_queue: {
    key: string;
    value: SyncQueueItem;
    indexes: { "by-status": string };
  };
}

const DB_NAME = "financeflow_pwa_cloud_db";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<FinanceDBSchema>> | null = null;

export function getOfflineDB() {
  if (typeof window === "undefined") return null;

  if (!dbPromise) {
    dbPromise = openDB<FinanceDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        let txStore;
        if (!db.objectStoreNames.contains("transactions")) {
          txStore = db.createObjectStore("transactions", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("accounts")) {
          db.createObjectStore("accounts", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("sync_queue")) {
          const queueStore = db.createObjectStore("sync_queue", { keyPath: "operationId" });
          queueStore.createIndex("by-status", "status");
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueSyncOperation(
  item: Omit<SyncQueueItem, "operationId" | "retryCount" | "status" | "createdAt" | "updatedAt">
): Promise<SyncQueueItem | null> {
  const db = await getOfflineDB();
  if (!db) return null;

  const now = new Date().toISOString();
  const queueItem: SyncQueueItem = {
    ...item,
    operationId: `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    retryCount: 0,
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
  };

  await db.put("sync_queue", queueItem);

  if (item.entity === "TRANSACTION" && item.payload) {
    await db.put("transactions", {
      ...item.payload,
      syncStatus: "PENDING",
      createdAt: now,
      updatedAt: now,
    });
  }

  return queueItem;
}

export async function getPendingSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getOfflineDB();
  if (!db) return [];
  const items = await db.getAllFromIndex("sync_queue", "by-status", "PENDING");
  const failed = await db.getAllFromIndex("sync_queue", "by-status", "FAILED");
  return [...items, ...failed];
}

export async function updateSyncQueueItemStatus(
  operationId: string,
  status: SyncQueueItem["status"],
  errorMessage?: string
) {
  const db = await getOfflineDB();
  if (!db) return;

  const item = await db.get("sync_queue", operationId);
  if (item) {
    item.status = status;
    item.updatedAt = new Date().toISOString();
    if (errorMessage) item.errorMessage = errorMessage;
    if (status === "FAILED") item.retryCount += 1;
    await db.put("sync_queue", item);
  }
}

export async function removeSyncQueueItem(operationId: string) {
  const db = await getOfflineDB();
  if (!db) return;
  await db.delete("sync_queue", operationId);
}

export async function rebuildLocalCacheFromCloud(cloudData: {
  accounts: any[];
  transactions: any[];
}) {
  const db = await getOfflineDB();
  if (!db) return;

  const tx = db.transaction(["accounts", "transactions"], "readwrite");
  await tx.objectStore("accounts").clear();
  await tx.objectStore("transactions").clear();

  for (const acc of cloudData.accounts) {
    await tx.objectStore("accounts").put({
      ...acc,
      updatedAt: acc.updatedAt || new Date().toISOString(),
    });
  }

  for (const t of cloudData.transactions) {
    await tx.objectStore("transactions").put({
      ...t,
      date: typeof t.date === "string" ? t.date : new Date(t.date).toISOString(),
      syncStatus: "SYNCED",
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || new Date().toISOString(),
    });
  }

  await tx.done;
}
