import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CV_SCHEMA, mergeCV } from "@/lib/cvModel";
import { useToast } from "@/components/ui/use-toast";
import { X, Loader2, Target, CheckCircle2, AlertTriangle } from "lucide-react";

const SCHEMA = {
  type: "object",
  properties: {
    matchPercent: { type: "number" },
    missing: { type: "array", items: { type: "string" } },
    weak: { type: "array", items: { type: "string" } },
    cv: CV_SCHEMA
  }
};

function Meter({ percent }) {
  const color = percent >= 75 ? "#16a34a" : percent >= 50 ? "#d97706" : "#dc2626";
  return (
    <div className="flex items-center gap-3" dir="ltr">
      <div className="relative flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: color }} />
      </div>
      <span className="text-2xl font-bold tabular-nums" style={{ color }}>{Math.round(percent)}%</span>
    </div>
  );
}

export default function JobMatchModal({ data, onApply, onClose }) {
  const { toast } = useToast();
  const [ad, setAd] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [applied, setApplied] = useState(false);

  const analyze = async () => {
    if (!ad.trim() || busy) return;
    setBusy(true); setResult(null); setApplied(false);
    try {
      const prompt = `Här är kandidatens CV som JSON:\n${JSON.stringify(data)}\n\nHär är en jobbannons:\n"""\n${ad}\n"""\n\nAnalysera hur väl CV:t matchar annonsen för ett svenskt ATS-system. Beräkna matchPercent (0-100). Identifiera viktiga nyckelord i annonsen som SAKNAS eller är svagt representerade i CV:t (missing). Identifiera svaga formuleringar i CV:t som kan stärkas utifrån annonsen (weak). Skapa sedan en uppdaterad version av CV:t (cv) som integrerar saknade nyckelord NATURLIGT i befintliga erfarenheter — hitta inte på nya jobb, lägg endast till relevanta färdigheter som rimligen kan finnas. Bevara ALL information. Returnera JSON enligt schemat.`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: SCHEMA });
      setResult(res);
    } catch (e) {
      toast({ title: "Kunde inte analysera", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!result?.cv) return;
    onApply(mergeCV(result.cv));
    setApplied(true);
    toast({ title: "Tillämpat", description: "CV:t har uppdaterats efter annonsen." });
  };

  return (
    <div dir="rtl" className="no-print-head fixed inset-0 z-50 bg-slate-900/80 backdrop-blur flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
        <span className="font-medium text-slate-900 inline-flex items-center gap-2"><Target className="w-4 h-4 text-[#1B4FD8]" /> مطابقة الإعلان الوظيفي</span>
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"><X className="w-4 h-4" /><span>إغلاق</span></button>
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="w-[340px] shrink-0 border-l border-slate-200 bg-white p-5 flex flex-col">
          <label className="text-sm font-medium text-slate-700 mb-2">الصق نص الإعلان الوظيفي</label>
          <textarea
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            rows={12}
            placeholder="Klistra in hela jobbannonsen här..."
            className="flex-1 w-full text-[13px] leading-relaxed resize-none border border-slate-200 rounded-xl p-3 outline-none focus:border-[#1B4FD8] focus:ring-2 focus:ring-[#1B4FD8]/10"
          />
          <button
            onClick={analyze}
            disabled={!ad.trim() || busy}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-xl bg-[#1B4FD8] text-white hover:bg-[#1640b0] transition-colors disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            {busy ? "جارٍ التحليل..." : "حلّل المطابقة"}
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6 bg-slate-100">
          {!result && !busy && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
              <Target className="w-10 h-10 mb-3 opacity-40" />
              ستظهر نتيجة المطابقة هنا
            </div>
          )}
          {busy && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#1B4FD8]" />
              <span className="text-sm">نحلّل المطابقة مع الإعلان...</span>
            </div>
          )}
          {result && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="text-sm text-slate-500 mb-2">نسبة المطابقة مع الإعلان</div>
                <Meter percent={result.matchPercent || 0} />
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> كلمات مفتاحية ناقصة</h3>
                <div className="flex flex-wrap gap-2">
                  {(result.missing || []).length === 0 && <span className="text-sm text-slate-400">لا توجد فجوات بارزة.</span>}
                  {(result.missing || []).map((k, i) => (
                    <span key={i} className="text-[12px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{k}</span>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">عبارات يُنصح بتقويتها</h3>
                <ul className="space-y-1.5 text-[13px] text-slate-600 list-disc pr-5">
                  {(result.weak || []).length === 0 && <li className="text-slate-400 list-none">لا توجد ملاحظات.</li>}
                  {(result.weak || []).map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
              <button
                onClick={apply}
                disabled={applied}
                className="w-full inline-flex items-center justify-center gap-1.5 text-sm px-4 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-60"
              >
                {applied ? <><CheckCircle2 className="w-4 h-4" /> تم التطبيق</> : <><CheckCircle2 className="w-4 h-4" /> طبّق التحسينات على السيرة</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}