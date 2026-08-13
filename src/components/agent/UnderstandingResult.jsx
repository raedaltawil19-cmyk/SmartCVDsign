import { AlertCircle, Target as TargetIcon } from "lucide-react";

const Row = ({ label, children }) => (
  <div className="flex gap-2 text-[13px] py-1 border-b border-slate-100 last:border-0">
    <span className="w-24 shrink-0 text-slate-400">{label}</span>
    <span className="text-slate-800 break-words">{children}</span>
  </div>
);

export default function UnderstandingResult({ result }) {
  if (!result) return null;
  const t = result.target;
  const pct = Math.round((result.confidence ?? 0) * 100);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <Row label="Intent">
        <code className="bg-slate-100 px-1.5 py-0.5 rounded">{result.intent}</code>
      </Row>
      <Row label="Target">
        {t ? (
          <span className="inline-flex items-center gap-1.5">
            <TargetIcon className="w-3.5 h-3.5 text-slate-400" />
            <code className="bg-slate-100 px-1.5 py-0.5 rounded">{t.ref}</code>
            <span className="text-slate-500">{t.label || t.sectionLabel}</span>
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </Row>
      <Row label="Field">{t?.field ? <code className="bg-slate-100 px-1.5 py-0.5 rounded">{t.field}</code> : <span className="text-slate-400">—</span>}</Row>
      <Row label="Modifiers">
        {result.modifiers?.length ? result.modifiers.join(" · ") : <span className="text-slate-400">—</span>}
      </Row>
      <Row label="Confidence">
        <span className={pct >= 70 ? "text-green-600" : pct >= 45 ? "text-amber-600" : "text-red-600"}>{pct}%</span>
      </Row>
      <Row label="Resolution">
        <code className="text-[11px] text-slate-500">{result.resolution?.status} / {result.resolution?.via || "—"}</code>
      </Row>
      <Row label="فهم الوكيل">{result.understanding || <span className="text-slate-400">—</span>}</Row>

      {result.needsClarification && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-[13px] text-amber-900">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{result.clarificationQuestion}</span>
        </div>
      )}
    </div>
  );
}