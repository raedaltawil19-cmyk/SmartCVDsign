import { useState } from "react";
import { CV_SCHEMA, mergeCV } from "@/lib/cvModel";
import { useToast } from "@/components/ui/use-toast";
import { useServices } from "@/hooks/useServices";
import { X, Loader2, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";

const SCHEMA = {
  type: "object",
  properties: {
    score: { type: "number" },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["high", "medium", "low"] },
          field: { type: "string" },
          message: { type: "string" }
        }
      }
    },
    cv: CV_SCHEMA
  }
};

const SEV = {
  high: { label: "مرتفع", color: "text-red-600 bg-red-50 border-red-200" },
  medium: { label: "متوسط", color: "text-amber-600 bg-amber-50 border-amber-200" },
  low: { label: "منخفض", color: "text-slate-600 bg-slate-50 border-slate-200" }
};

export default function QualityModal({ data, onApply, onClose }) {
  const { toast } = useToast();
  const { llm } = useServices();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [applied, setApplied] = useState(false);

  const check = async () => {
    setBusy(true); setResult(null); setApplied(false);
    try {
      const prompt = `Granska följande CV (JSON) på svenska ur ett kvalitetsperspektiv.\n${JSON.stringify(data)}\n\nIdentifiera problem: AI-klyschor (t.ex. "passionerad", "mångsidig", "resultatorienterad", "drivs av"), passiva formuleringar, ospecifika beskrivningar, upprepningar, och uppenbara språkfel. Ange severity (high/medium/low), vilket fält det gäller, och ett kort meddelande. Beräkna score (0-100, högre = bättre). Skapa sedan en förbättrad version (cv) där problemen åtgärdats — men SAMMANFATTA INTE och FÖRKORTA INTE, bevara all information. Returnera JSON enligt schemat.`;
      const res = await llm.completeJson({ prompt, schema: SCHEMA });
      setResult(res);
    } catch (e) {
      toast({ title: "Kunde inte granska", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!result?.cv) return;
    onApply(mergeCV(result.cv));
    setApplied(true);
    toast({ title: "Åtgärdat", description: "CV:t har förbättrats." });
  };

  const issues = result?.issues || [];

  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
        <span className="font-medium text-slate-900 inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#1B4FD8]" /> فحص جودة النص</span>
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"><X className="w-4 h-4" /><span>إغلاق</span></button>
      </div>
      <div className="flex-1 overflow-auto p-6 bg-slate-100">
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={check} disabled={busy} className="inline-flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl bg-[#1B4FD8] text-white hover:bg-[#1640b0] transition-colors disabled:opacity-40">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {busy ? "جارٍ الفحص..." : result ? "أعد الفحص" : "ابدأ الفحص"}
            </button>
            {result && (
              <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                <span>النتيجة:</span>
                <span className="text-xl font-bold" style={{ color: (result.score || 0) >= 75 ? "#16a34a" : (result.score || 0) >= 50 ? "#d97706" : "#dc2626" }}>{Math.round(result.score || 0)}/100</span>
              </div>
            )}
          </div>

          {busy && !result && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#1B4FD8]" />
              <span className="text-sm">نفحص النص بحثاً عن كليشيهات وضعف...</span>
            </div>
          )}

          {result && (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> الملاحظات ({issues.length})</h3>
                {issues.length === 0 ? (
                  <p className="text-sm text-slate-400">لا توجد ملاحظات — نص نظيف.</p>
                ) : (
                  <div className="space-y-2.5">
                    {issues.map((it, i) => {
                      const s = SEV[it.severity] || SEV.low;
                      return (
                        <div key={i} className="flex items-start gap-2">
                          <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                          <div className="text-[13px] text-slate-700">
                            <span className="font-medium">{it.field}:</span> {it.message}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <button onClick={apply} disabled={applied} className="w-full inline-flex items-center justify-center gap-1.5 text-sm px-4 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-60">
                {applied ? <><CheckCircle2 className="w-4 h-4" /> تم التطبيق</> : <><CheckCircle2 className="w-4 h-4" /> أصلح الكل تلقائياً</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}