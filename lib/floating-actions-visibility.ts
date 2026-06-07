type Listener = (hidden: boolean) => void;

let hidden = false;
const listeners = new Set<Listener>();

export function getMainFloatingActionsHidden() {
  return hidden;
}

export function setMainFloatingActionsHidden(nextHidden: boolean) {
  if (hidden === nextHidden) return;
  hidden = nextHidden;
  listeners.forEach((listener) => listener(hidden));
}

export function subscribeMainFloatingActionsHidden(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
