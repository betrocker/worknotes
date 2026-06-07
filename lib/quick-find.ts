type QuickFindOpenListener = () => void;

const listeners = new Set<QuickFindOpenListener>();

export function openQuickFind() {
  listeners.forEach((listener) => listener());
}

export function subscribeQuickFindOpen(listener: QuickFindOpenListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
