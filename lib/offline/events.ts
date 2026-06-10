type OfflineSyncListener = () => void;

const listeners = new Set<OfflineSyncListener>();

export function subscribeOfflineSyncNeeded(listener: OfflineSyncListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyOfflineSyncNeeded() {
  listeners.forEach((listener) => listener());
}
