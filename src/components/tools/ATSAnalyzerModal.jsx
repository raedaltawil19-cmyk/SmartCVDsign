import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useServices } from "@/hooks/useServices";
import { mergeCV } from "@/lib/cvModel";
import { X, Loader2, Gauge, RotateCw, CheckCircle2, AlertTriangle, Sparkles, Wand2, ThumbsUp, ThumbsDown } from "lucide-react";

const CATEGORY_LABELS = {
  headings: "العناوين",
  keywords: "الكلمات المفتاحية",
  formatting: "التنسيق",
  readability: "القراءة",
  contact: "بيانات التواصل",
  skills: "المهارات",
  experience: "الخبرة المهنية",
  education: "التعليم",
  length: "الطول",
  fileCompatibility: "توافق الملف",
};

function scoreColor(s) {
  if (s >= 75) return "#16a34a";
  if (s >= 50) return "#d97706";
  return "#dc2626";
}

function Ring({ value }) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  const c = scoreColor(v);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (v / 100) * circ;
  return (
    <div className="relative w-32 h-32">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={c} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color: c }}>{v}</span>
        <span className="text-[11px] text-slate-400 -mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

export default function ATSAnalyzerModal({ data, onApply, onClose }) {
  const { toast } = useToast();
  const { llm } = useServices();
  const [workData, setWorkData] = useState(data);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [applyingId, setApplyingId] = useState(null);
  const [fixedIds, setFixedIds] = useState({});

  const analyze = useCallback(async (cv) => {
    setBusy(true); setResult(null);
    try {
      const res = await llm.atsAnalyze(cv);
      setResult(res);
    } catch (e) {
      toast({ title: "تعذّر إجراء التحليل", variant: "destructive" });
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, llm]);

  useEffect(() => { analyze(workData); /* eslint-disable-next-line */ }, []);

  const fix = async (idx, s) => {
    setApplyingId(idx);
    try {
      const updated = await llm.transformCV(workData, s.fixInstruction);
      const merged = mergeCV(updated);
      setWorkData(merged);
      onApply(merged);
      setFixedIds((m) => ({ ...m, [idx]: true }));
      toast({ title: "تم الإصلاح", description: s.title });
      analyze(merged);
    } catch (e) {
      toast({ title: "تعذّر تطبيق الإصلاح", variant: "destructive" });
    } finally {
      setApplyingId(null);
    }
  };

  const overall = result?.overallScore || 0;
  const categories = result?.categories || [];
  const strengths = result?.strengths || [];
  const weaknesses = result?.weaknesses || [];
  const suggestions = result?.suggestions || [];

  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
        <span className="font-medium text-slate-900 inline-flex items-center gap-2">
          <Gauge className="w-4 h-4 text-[#1B4FD8]" /> محلّل توافق ATS
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => analyze(workData)} disabled={busy} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
            <span className="hidden sm:inline">إعادة التحليل</span>
          </button>
          <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
            <X className="w-4 h-4" /><span>إغلاق</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-slate-100">
        <div className="max-w-2xl mx-auto space-y-5">
          {(busy || !result) ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#1B4FD8]" />
              <span className="text-sm">{busy ? "نحلّل توافق سيرتك مع أنظمة ATS..." : "جارٍ التحضير..."}</span>
            </div>
          ) : (
            <>
              {/* Overall score */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-6">
                <Ring value={overall} />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">النتيجة الإجمالية</h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed">
                    {overall >= 75 ? "سيرتك جاهزة لمعظم أنظمة ATS. توافق ممتاز." : overall >= 50 ? "توافق متوسط — أصلح النقاط الضعيفة لرفع فرصك." : "توافق منخفض — قد تُستبعد سيرتك تلقائياً. أصلح الاقتراحات أدناه."}
                  </p>
                </div>
              </div>

              {/* Category breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">تفصيل الفئات (١٠)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {categories.map((c) => (
                    <div key={c.key}>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span className="text-slate-600">{CATEGORY_LABELS[c.key] || c.key}</span>
                        <span className="font-semibold" style={{ color: scoreColor(c.score) }}>{Math.round(c.score)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: scoreColor(c.score) }} />
                      </div>
                      {c.note && <p className="text-[11px] text-slate-400 mt-1 leading-snug">{c.note}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths & weaknesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><ThumbsUp className="w-4 h-4 text-emerald-600" /> نقاط القوة</h3>
                  {strengths.length ? (
                    <ul className="space-y-2">
                      {strengths.map((s, i) => (
                        <li key={i} className="text-[13px] text-slate-600 flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> {s}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-[13px] text-slate-400">لا توجد نقاط قوة بارزة بعد.</p>}
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><ThumbsDown className="w-4 h-4 text-red-600" /> نقاط الضعف</h3>
                  {weaknesses.length ? (
                    <ul className="space-y-2">
                      {weaknesses.map((s, i) => (
                        <li key={i} className="text-[13px] text-slate-600 flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" /> {s}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-[13px] text-slate-400">لا توجد نقاط ضعف بارزة.</p>}
                </div>
              </div>

              {/* Suggestions */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#1B4FD8]" /> اقتراحات الإصلاح التلقائي</h3>
                {suggestions.length === 0 ? (
                  <p className="text-[13px] text-slate-400">لا توجد اقتراحات حالياً.</p>
                ) : (
                  <div className="space-y-3">
                    {suggestions.map((s, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1B4FD8]/10 text-[#1B4FD8] font-medium">{CATEGORY_LABELS[s.category] || s.category}</span>
                              <h4 className="text-[13px] font-semibold text-slate-800">{s.title}</h4>
                            </div>
                            <p className="text-[12px] text-slate-500 leading-relaxed">{s.message}</p>
                          </div>
                          <button
                            onClick={() => fix(i, s)}
                            disabled={!!fixedIds[i] || applyingId === i || busy}
                            className="shrink-0 inline-flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-default"
                          >
                            {fixedIds[i] ? <><CheckCircle2 className="w-3.5 h-3.5" /> تم الإصلاح</>
                              : applyingId === i ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> جارٍ...</>
                              : <><Wand2 className="w-3.5 h-3.5" /> إصلاح</>}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">لا يتم تعديل سيرتك إلا عند الضغط على «إصلاح». بعد كل إصلاح يُعاد تحليل النتيجة تلقائياً.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}