import { useEffect, useState } from "react";

const MAX = 80;
let entries = [];
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn(entries));
}

/**
 * سجّل إجراءً قام به المستخدم أو الوكيل.
 * dedupeKey: إن تكرر نفس المفتاح خلال 1.5 ثانية يُتجاهل (لتقليل ضجيج الكتابة).
 */
export function logAction(type, detail, dedupeKey = null) {
  if (dedupeKey) {
    const last = entries.find((e) => e.dedupeKey === dedupeKey);
    if (last && Date.now() - last.ts.getTime() < 1500) return;
  }
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ts: new Date(),
    type,
    detail: detail || {},
    dedupeKey,
  };
  entries = [entry, ...entries].slice(0, MAX);
  emit();
  // eslint-disable-next-line no-console
  console.log(`[action:${type}]`, detail);
}

export function useActionLog() {
  const [log, setLog] = useState(entries);
  useEffect(() => {
    const fn = (e) => setLog(e);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return log;
}

export function clearActionLog() {
  entries = [];
  emit();
}