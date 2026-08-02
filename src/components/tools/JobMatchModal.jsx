import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CV_SCHEMA, mergeCV } from "@/lib/cvModel";
import { useToast } from "@/components/ui/use-toast";
import { useServices } from "@/hooks/useServices";
import { X, Loader2, Target, CheckCircle2, AlertTriangle, Link2, FileText, Download as DownloadIcon } from "lucide-react";

const SCHEMA = {
  type: "object",
  properties: {
    matchPercent: { type: "number" },
    swedishKeywords: {
      type: "array",
      items: {
        type: "object",
        properties: {
          keyword: { type: "string" },
          importance: { type: "string", enum: ["high", "medium", "low"] },
          present: { type: "boolean" }
        }
      }
    },
    requirements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          requirement: { type: "string" },
          status: { type: "string", enum: ["matched", "partial", "missing"] },
          note: { type: "string" }
        }
      }
    },
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

const IMP = {
  high: { label: "عالي", cls: "bg-[#1B4FD8] text-white" },
  medium: { label: "متوسط", cls: "bg-slate-200 text-slate-700" },
  low: { label: "منخفض", cls: "bg-slate-100 text-slate-500" }
};

const STATUS = {
  matched: { label: "مطابق", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  partial: { label: "جزئي", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  missing: { label: "ناقص", cls: "bg-red-50 text-red-700 border-red-200" }
};

export default function JobMatchModal({ data, onApply, onClose }) {
  const { toast } = useToast();
  const { llm } = useServices();
  const [mode, setMode] = useState("text"); // "text" | "link"
  const [ad, setAd] = useState("");
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [applied, setApplied] = useState(false);

  const resolveAd = async () => {
    if (busy) return;
    let content = ad.trim();
    if (mode === "link" && url.trim()) {
      setFetching(true);
      try {
        const res = await base44.functions.invoke("FetchJobAd", { url: url.trim() });
        content = res.data?.text || "";
        if (!content) {
          toast({ title: "لم نتمكن من جلب محتوى الرابط", variant: "destructive" });
          setFetching(false);
          return null;
        }
        if (/cookie|godkänn|blockerat|captcha|robot/i.test(content.slice(0, 400))) {
          toast({ title: "قد يطلب الموقع موافقة/تحقق — جرّب لصق النص بدلاً من الرابط", variant: "destructive" });
        }
      } catch (e) {
        setFetching(false);
        toast({ title: "تعذّر جلب الرابط", description: "جرّب لصق نص الإعلان مباشرة.", variant: "destructive" });
        return null;
      }
      setFetching(false);
    }
    if (!content) {
      toast({ title: "الصق نصًا أو رابطًا للإعلان", variant: "destructive" });
      return null;
    }
    return content;
  };

  const analyze = async () => {
    const content = await resolveAd();
    if (!content) return;
    setBusy(true); setResult(null); setApplied(false);
    try {
      const prompt = `Här är kandidatens CV som JSON:\n${JSON.stringify(data)}\n\nHär är en svensk jobbannons:\n"""\n${content}\n"""\n\nUtför en svensk ATS-analys:\n1. matchPercent: hur väl CV:t matchar annonsen (0-100).\n2. swedishKeywords: de viktigaste nyckelorden för den svenska arbetsmarknaden i denna annons (8–15), med importance (high/medium/low) och present (true om de finns i CV:t, false annars).\n3. requirements: annonsens konkreta krav/önskemål, var och en med status matched/partial/missing och en kort note om vad som matchar/saknas i kandidatens erfarenhet.\n4. weak: svaga formuleringar i CV:t som bör stärkas.\n5. cv: en uppdaterad version av CV:t som integrerar SAKNADE nyckelord NATURLIGT i befintliga erfarenheter — hitta inte på nya jobb, lägg endast till relevanta färdigheter som rimligen kan finnas. Bevara ALL information. SAMMANFATTA INTE.\nReturnera JSON enligt schemat.`;
      const res = await llm.completeJson({ prompt, schema: SCHEMA });
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

  const kws = result?.swedishKeywords || [];
  const reqs = result?.requirements || [];

  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
        <span className="font-medium text-slate-900 inline-flex items-center gap-2"><Target className="w-4 h-4 text-[#1B4FD8]" /> تحليل الإعلان الوظيفي</span>
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"><X className="w-4 h-4" /><span>إغلاق</span></button>
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="w-[340px] shrink-0 border-l border-slate-200 bg-white p-5 flex flex-col">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-3">
            <button onClick={() => setMode("text")} className={`flex-1 inline-flex items-center justify-center gap-1.5 text-[13px] px-3 py-2 rounded-lg transition-colors ${mode === "text" ? "bg-white shadow-sm font-medium" : "text-slate-500"}`}><FileText className="w-4 h-4" />نص</button>
            <button onClick={() => setMode("link")} className={`flex-1 inline-flex items-center justify-center gap-1.5 text-[13px] px-3 py-2 rounded-lg transition-colors ${mode === "link" ? "bg-white shadow-sm font-medium" : "text-slate-500"}`}><Link2 className="w-4 h-4" />رابط</button>
          </div>

          {mode === "text" ? (
            <>
              <textarea
                value={ad}
                onChange={(e) => setAd(e.target.value)}
                rows={12}
                placeholder="Klistra in hela jobbannonsen här..."
                className="flex-1 w-full text-[13px] leading-relaxed resize-none border border-slate-200 rounded-xl p-3 outline-none focus:border-[#1B4FD8] focus:ring-2 focus:ring-[#1B4FD8]/10"
              />
              <button onClick={analyze} disabled={!ad.trim() || busy} className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-xl bg-[#1B4FD8] text-white hover:bg-[#1640b0] transition-colors disabled:opacity-40">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                {busy ? "جارٍ التحليل..." : "حلّل المطابقة"}
              </button>
            </>
          ) : (
            <>
              <label className="text-sm font-medium text-slate-700 mb-2">رابط الإعلان الوظيفي</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full text-[13px] border border-slate-200 rounded-xl p-3 outline-none focus:border-[#1B4FD8] focus:ring-2 focus:ring-[#1B4FD8]/10"
                dir="ltr"
              />
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">نجلب محتوى الرابط ونحلّله. إن طلب الموقع موافقة أو تحققًا بشريًا، انسخ النص بدلاً منه.</p>
              <div className="flex-1" />
              <button onClick={analyze} disabled={(!url.trim() && !ad.trim()) || busy} className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-xl bg-[#1B4FD8] text-white hover:bg-[#1640b0] transition-colors disabled:opacity-40">
                {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                {fetching ? "نجلب الإعلان..." : busy ? "جارٍ التحليل..." : "اجلب وحلّل"}
              </button>
            </>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-100">
          <div className="max-w-2xl mx-auto space-y-5">
            {!result && !busy && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm pt-24">
                <Target className="w-10 h-10 mb-3 opacity-40" />
                الصق رابطًا أو نص الإعلان ثم ابدأ التحليل
              </div>
            )}
            {busy && (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 pt-24">
                <Loader2 className="w-8 h-8 animate-spin text-[#1B4FD8]" />
                <span className="text-sm">نحلّل المطابقة ونستخرج الكلمات المفتاحية السويدية...</span>
              </div>
            )}

            {result && (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="text-sm text-slate-500 mb-2">نسبة المطابقة مع الإعلان</div>
                  <Meter percent={result.matchPercent || 0} />
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">الكلمات المفتاحية الأهم للسوق السويدي</h3>
                  <div className="flex flex-wrap gap-2">
                    {kws.length === 0 && <span className="text-sm text-slate-400">لا توجد.</span>}
                    {kws.map((k, i) => {
                      const imp = IMP[k.importance] || IMP.low;
                      return (
                        <span key={i} className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full border ${k.present ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${imp.cls}`}>{imp.label}</span>
                          {k.keyword}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-3">أخضر = متوفّر في سيرتك، كهرماني = يُنصح بإضافتها</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> مطابقة المتطلبات ({reqs.length})</h3>
                  {reqs.length === 0 ? <p className="text-sm text-slate-400">لا توجد متطلبات بارزة.</p> : (
                    <div className="space-y-2">
                      {reqs.map((r, i) => {
                        const s = STATUS[r.status] || STATUS.missing;
                        return (
                          <div key={i} className="flex items-start gap-2.5">
                            <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>
                            <div className="text-[13px] text-slate-700">
                              <div className="font-medium">{r.requirement}</div>
                              {r.note && <div className="text-[12px] text-slate-500">{r.note}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">عبارات يُنصح بتقويتها</h3>
                  <ul className="space-y-1.5 text-[13px] text-slate-600 list-disc pr-5">
                    {(result.weak || []).length === 0 && <li className="text-slate-400 list-none">لا توجد ملاحظات.</li>}
                    {(result.weak || []).map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>

                <button onClick={apply} disabled={applied} className="w-full inline-flex items-center justify-center gap-1.5 text-sm px-4 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-60">
                  {applied ? <><CheckCircle2 className="w-4 h-4" /> تم التطبيق</> : <><DownloadIcon className="w-4 h-4" /> طبّق التحسينات على السيرة</>}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}