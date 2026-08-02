import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useServices } from "@/hooks/useServices";
import { X, Loader2, Wallet, TrendingUp, Lightbulb, Check } from "lucide-react";

const LEVELS = [
  { key: "junior", label: "Junior", sub: "0–2 år" },
  { key: "mid", label: "Mid", sub: "3–6 år" },
  { key: "senior", label: "Senior", sub: "7+ år" },
];

const REGIONS = ["Stockholm", "Göteborg", "Malmö", "Uppsala", "Övriga Sverige"];
const INDUSTRIES = ["IT/Tech", "Finans", "Hälso- och sjukvård", "Industri", "Bygg", "Handel", "Offentlig sektor", "Konsult", "Marknadsföring", "Utbildning", "Annat"];

const CONF = {
  high: { label: "عالية", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  medium: { label: "متوسطة", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  low: { label: "منخفضة", cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
};

const fmt = (n) => (n == null || isNaN(n) ? "—" : Math.round(n).toLocaleString("sv-SE"));

export default function SalaryAdvisorModal({ data, onClose }) {
  const { toast } = useToast();
  const { llm } = useServices();
  const [jobTitle, setJobTitle] = useState(data?.profession || data?.titel || data?.sammanfattning || "");
  const [region, setRegion] = useState("Stockholm");
  const [experience, setExperience] = useState("mid");
  const [industry, setIndustry] = useState("IT/Tech");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const guessTitle = () => {
    const first = (data?.erfarenhet || [])[0];
    if (first?.roll) return first.roll;
    return "";
  };

  const run = async () => {
    const title = (jobTitle || guessTitle()).trim();
    if (!title) {
      toast({ title: "أدخل المسمى الوظيفي", variant: "destructive" });
      return;
    }
    setJobTitle(title);
    setBusy(true); setResult(null);
    try {
      const res = await llm.estimateSalary({ jobTitle: title, region, experience, industry });
      if (!res || (res.averageMonthly == null && res.median == null)) {
        toast({ title: "تعذّر تقدير الراتب", variant: "destructive" });
      } else {
        setResult(res);
      }
    } catch (e) {
      toast({ title: "تعذّر تقدير الراتب", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
        <span className="font-medium text-slate-900 inline-flex items-center gap-2">
          <Wallet className="w-4 h-4 text-[#1B4FD8]" /> مستشار الرواتب
        </span>
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
          <X className="w-4 h-4" /><span>إغلاق</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-slate-100">
        <div className="max-w-xl mx-auto space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div>
              <label className="text-[12px] text-slate-500 mb-1.5 block">المسمى الوظيفي</label>
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="مثال: Software Developer, Sjuksköterska..."
                className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#1B4FD8]"
              />
            </div>

            <div>
              <div className="text-[12px] text-slate-500 mb-1.5">مستوى الخبرة</div>
              <div className="flex gap-1.5">
                {LEVELS.map((l) => (
                  <button
                    key={l.key}
                    onClick={() => setExperience(l.key)}
                    className={`flex-1 px-2 py-2 rounded-lg border text-center transition-colors ${experience === l.key ? "bg-[#1B4FD8] text-white border-[#1B4FD8]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                  >
                    <div className="text-[13px] font-medium">{l.label}</div>
                    <div className={`text-[10px] ${experience === l.key ? "text-white/70" : "text-slate-400"}`}>{l.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] text-slate-500 mb-1.5 block">المنطقة</label>
                <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2.5 bg-white outline-none focus:border-[#1B4FD8]">
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] text-slate-500 mb-1.5 block">المجال</label>
                <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2.5 bg-white outline-none focus:border-[#1B4FD8]">
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>

            <button onClick={run} disabled={busy} className="w-full inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-xl bg-[#1B4FD8] text-white hover:bg-[#1640b0] disabled:opacity-40">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              {busy ? "جاري التقدير..." : "قدّر الراتب"}
            </button>
            <p className="text-[11px] text-slate-400 text-center">تقديرات استرشادية للسوق السويدي بالكرونة (SEK قبل الضرائب) — تستند إلى اتجاهات السوق وقد تختلف حسب الشركة والمهام.</p>
          </div>

          {result && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="text-[12px] text-slate-500">متوسط الراتب الشهري</div>
                    <div className="text-3xl font-bold text-slate-900" dir="ltr">{fmt(result.averageMonthly)} <span className="text-[14px] font-normal text-slate-400">{result.currency || "SEK"}</span></div>
                    <div className="text-[12px] text-slate-400 mt-0.5">المدى النموذجي: {fmt(result.lowMonthly)} – {fmt(result.highMonthly)} {result.currency || "SEK"}</div>
                  </div>
                  {result.confidence && CONF[result.confidence] && (
                    <div className={`shrink-0 inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-full border ${CONF[result.confidence].cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${CONF[result.confidence].dot}`} />
                      ثقة {CONF[result.confidence].label}
                    </div>
                  )}
                </div>

                {result.confidenceNote && (
                  <div className="text-[12px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mb-4">{result.confidenceNote}</div>
                )}

                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-[13px] font-semibold text-slate-900 mb-3 inline-flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-[#1B4FD8]" /> مدى التفاوض المقترح (شهرياً)</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-slate-200 p-3 text-center">
                      <div className="text-[11px] text-slate-400">الحد الأدنى</div>
                      <div className="text-[15px] font-semibold text-slate-700" dir="ltr">{fmt(result.recommendedRange?.low)}</div>
                    </div>
                    <div className="rounded-xl border-2 border-[#1B4FD8] p-3 text-center bg-[#1B4FD8]/5">
                      <div className="text-[11px] text-[#1B4FD8]">الهدف</div>
                      <div className="text-[15px] font-bold text-[#1B4FD8]" dir="ltr">{fmt(result.recommendedRange?.target)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3 text-center">
                      <div className="text-[11px] text-slate-400">الحد الأقصى</div>
                      <div className="text-[15px] font-semibold text-slate-700" dir="ltr">{fmt(result.recommendedRange?.high)}</div>
                    </div>
                  </div>
                </div>

                {(result.percentile25 != null || result.median != null || result.percentile75 != null) && (
                  <div className="border-t border-slate-100 mt-4 pt-4">
                    <h3 className="text-[13px] font-semibold text-slate-900 mb-3">التوزيع حسب النسب المئوية</h3>
                    <div className="space-y-2">
                      <Bar label="25%" value={result.percentile25} max={result.percentile75 || result.highMonthly} />
                      <Bar label="50% (الوسيط)" value={result.median} max={result.percentile75 || result.highMonthly} highlight />
                      <Bar label="75%" value={result.percentile75} max={result.percentile75 || result.highMonthly} />
                    </div>
                  </div>
                )}

                {result.sourceContext && (
                  <p className="text-[11px] text-slate-400 mt-4 border-t border-slate-100 pt-3 leading-relaxed">{result.sourceContext}</p>
                )}
              </div>

              {result.negotiationTips && result.negotiationTips.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-[13px] font-semibold text-slate-900 mb-3 inline-flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-amber-500" /> نصائح التفاوض</h3>
                  <ul className="space-y-2">
                    {result.negotiationTips.map((t, i) => (
                      <li key={i} className="text-[13px] text-slate-600 flex gap-2 leading-relaxed">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, max, highlight }) {
  const pct = max && value ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-500 w-24 shrink-0 text-left" dir="ltr">{label}</span>
      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${highlight ? "bg-[#1B4FD8]" : "bg-slate-300"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[12px] w-20 text-left tabular-nums ${highlight ? "font-bold text-slate-900" : "text-slate-600"}`} dir="ltr">{fmt(value)}</span>
    </div>
  );
}