import { useState } from "react";
import { understandCommand } from "@/lib/agent/understandCommand";
import { Loader2, FlaskConical } from "lucide-react";

const DEFAULT_CMD = "شو آخر خبرة موجودة بالCV؟";

/**
 * اختبار معزول: يستدعي understandCommand مباشرة على السيرة الحقيقية،
 * بدون أدوات تعديل وبدون سياق محادثة أو آخر هدف (فلا دور للإشارات السياقية).
 */
export default function IsolatedUnderstandTest({ data }) {
  const [cmd, setCmd] = useState(DEFAULT_CMD);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(null);
  const [err, setErr] = useState(null);

  const run = async () => {
    setBusy(true); setErr(null); setOut(null);
    try {
      const res = await understandCommand({ data, message: cmd, history: [], lastItemRef: null });
      setOut(res);
    } catch (e) {
      console.error("[understandCommand] failed:", e);
      setErr(`${e?.name || "Error"}: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
        <FlaskConical className="w-4 h-4" /> اختبار معزول لطبقة الفهم
      </div>
      <div className="flex gap-2">
        <input value={cmd} onChange={(e) => setCmd(e.target.value)} className="inp flex-1" />
        <button onClick={run} disabled={busy || !data} className="px-3 py-2 rounded-xl bg-[#000066] text-white text-[12px] disabled:opacity-40 inline-flex items-center gap-1.5">
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} تشغيل
        </button>
      </div>
      {err && <pre dir="ltr" className="text-[11px] text-red-600 bg-red-50 rounded-lg p-3 whitespace-pre-wrap">{err}</pre>}
      {out && (
        <pre dir="ltr" className="text-[11px] text-slate-700 bg-slate-50 rounded-lg p-3 overflow-x-auto max-h-72">
          {JSON.stringify({ intent: out.intent, target: out.target, resolution: out.resolution, confidence: out.confidence, needsClarification: out.needsClarification, understanding: out.understanding }, null, 1)}
        </pre>
      )}
    </div>
  );
}