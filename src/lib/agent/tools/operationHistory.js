/**
 * سجل العمليات — أساس undo/redo لاحقًا.
 * كل عملية تحفظ الحالة السابقة والجديدة للجزء المتأثر.
 */
const MAX = 100;
let operations = [];
let counter = 0;
const listeners = new Set();

const emit = () => listeners.forEach((l) => l([...operations]));

export function recordOperation({ tool, targetId, field, before, after, summary, meta }) {
  const op = {
    operationId: `op_${++counter}`,
    tool,
    targetId: targetId || null,
    field: field || null,
    meta: meta || null,
    previousState: before,
    newState: after,
    summary: summary || "",
    at: new Date().toISOString(),
    undone: false
  };
  operations = [...operations, op].slice(-MAX);
  emit();
  return op;
}

export const listOperations = () => [...operations];
export const lastOperation = () => operations.filter((o) => !o.undone).slice(-1)[0] || null;

export function markUndone(operationId, undone = true) {
  operations = operations.map((o) => (o.operationId === operationId ? { ...o, undone } : o));
  emit();
}

export function clearOperations() {
  operations = [];
  emit();
}

export function subscribeOperations(fn) {
  listeners.add(fn);
  fn([...operations]);
  return () => listeners.delete(fn);
}