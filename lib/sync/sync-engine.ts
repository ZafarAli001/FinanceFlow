import {
  getPendingSyncQueue,
  updateSyncQueueItemStatus,
  removeSyncQueueItem,
  rebuildLocalCacheFromCloud,
  SyncQueueItem,
} from "./indexed-db";

type SyncStatusListener = (status: {
  state: "SYNCED" | "SYNCING" | "PENDING" | "FAILED";
  pendingCount: number;
  message?: string;
}) => void;

const listeners: Set<SyncStatusListener> = new Set();

export function subscribeSyncStatus(listener: SyncStatusListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(state: "SYNCED" | "SYNCING" | "PENDING" | "FAILED", pendingCount: number, message?: string) {
  listeners.forEach((fn) => fn({ state, pendingCount, message }));
}

/**
 * Executes cloud synchronization of local pending queue
 */
export async function syncOfflineQueue(): Promise<{ syncedCount: number; errors: any[] }> {
  if (typeof window === "undefined" || !navigator.onLine) {
    const pending = await getPendingSyncQueue();
    notifyListeners("PENDING", pending.length, "Offline mode");
    return { syncedCount: 0, errors: [] };
  }

  const pendingQueue = await getPendingSyncQueue();
  if (!pendingQueue.length) {
    notifyListeners("SYNCED", 0, "All changes synced");
    return { syncedCount: 0, errors: [] };
  }

  notifyListeners("SYNCING", pendingQueue.length, "Syncing changes with cloud...");

  let syncedCount = 0;
  const errors: any[] = [];

  for (const item of pendingQueue) {
    try {
      await updateSyncQueueItemStatus(item.operationId, "SYNCING");

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationType: item.operationType,
          clientId: item.clientId,
          recordId: item.recordId,
          payload: item.payload,
        }),
      });

      if (res.ok) {
        await removeSyncQueueItem(item.operationId);
        syncedCount++;
      } else {
        const errData = await res.json();
        await updateSyncQueueItemStatus(item.operationId, "FAILED", errData.error || "Server error");
        errors.push({ id: item.operationId, error: errData.error || "Sync failed" });
      }
    } catch (err: any) {
      await updateSyncQueueItemStatus(item.operationId, "FAILED", err.message);
      errors.push({ id: item.operationId, error: err.message });
    }
  }

  const remaining = await getPendingSyncQueue();
  if (remaining.length > 0) {
    notifyListeners("FAILED", remaining.length, `${remaining.length} changes failed to sync`);
  } else {
    notifyListeners("SYNCED", 0, "Cloud sync complete");
  }

  return { syncedCount, errors };
}

/**
 * Pulls cloud data for multi-device sync
 */
export async function pullCloudUpdates() {
  if (typeof window === "undefined" || !navigator.onLine) return;
  try {
    const res = await fetch("/api/sync/pull");
    if (res.ok) {
      const data = await res.json();
      await rebuildLocalCacheFromCloud({
        accounts: data.accounts || [],
        transactions: data.transactions || [],
      });
    }
  } catch (err) {
    console.error("Cloud pull updates error:", err);
  }
}

let syncIntervalTimer: any = null;

export function registerAutoSync() {
  if (typeof window === "undefined") return;

  // Initial pull and sync on load
  pullCloudUpdates();
  syncOfflineQueue();

  // Listen to window online event
  window.addEventListener("online", () => {
    syncOfflineQueue();
    pullCloudUpdates();
  });

  window.addEventListener("focus", () => {
    pullCloudUpdates();
    syncOfflineQueue();
  });

  // Background multi-device sync polling interval every 15 seconds
  if (!syncIntervalTimer) {
    syncIntervalTimer = setInterval(() => {
      if (navigator.onLine) {
        pullCloudUpdates();
        syncOfflineQueue();
      }
    }, 15000);
  }
}
