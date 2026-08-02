import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useServices } from "@/hooks/useServices";
import { X, Loader2, Briefcase, ExternalLink, Search, Sparkles, MapPin, Clock } from "lucide-react";

function buildQuery(data) {
  const parts = [];
  if (data.titel) parts.push(data.titel);
  const skills = (data.fardigheter || []).map(s => s.namn).filter(Boolean).slice(0, 6);
  parts.push(...skills);
  return parts.join(" ").trim();
}

export default function JobSuggestionsModal({ data, onClose }) {
  const { toast } = useToast();
  const { jobs: jobsService } = useServices();
  const [q, setQ] = useState(() => buildQuery(data));
  const [remote, setRemote] = useState(false);
  const [days, setDays] = useState(14);
  const [fetching, setFetching] = useState(false);
  const [matching, setMatching] = useState(false);
  const [jobs, setJobs] = useState(null);   // raw ads
  const [matches, setMatches] = useState(null); // ranked with score

  const search = async () => {
    if (!q.trim()) { toast({ title: "أدخل كلمات البحث أولاً", variant: "destructive" }); return; }
    setFetching(true); setMatches(null);
    try {
      const res = await jobsService.search({ q: q.trim(), remote, publishedDays: days, limit: 20 });
      const list = res.data?.jobs || [];
      setJobs(list);
      if (list.length === 0) {
        toast({ title: "لا توجد وظائف مطابقة حالياً", description: "جرّب كلمات بحث أوسع." });
      } else {
        rank(list);
      }
    } catch (e) {
      toast({ title: "تعذّر جلب الوظائف", variant: "destructive" });
    } finally {
      setFetching(false);
    }
  };

  const rank = async (list) => {
    setMatching(true);
    try {
      const jobsInput = list.map(j => ({ id: j.id, rubrik: j.rubrik, arbetsgivare: j.arbetsgivare, plats: [j.kommun, j.lan].filter(Boolean).join(", "), beskrivning: j.beskrivning.slice(0, 500), krav: j.erfarenhetKrav }));
      const res = await jobsService.rank(data, jobsInput);
      const arr = res.results || [];
      const byId = {};
      arr.forEach(r => { byId[r.id] = r; });
      const ranked = list.map(j => ({ ...j, matchPercent: byId[j.id]?.matchPercent ?? 0, reason: byId[j.id]?.reason || "" })).sort((a, b) => (b.matchPercent || 0) - (a.matchPercent || 0));
      setMatches(ranked);
    } catch (e) {
      // fallback: show jobs without scores
      setMatches(list.map(j => ({ ...j, matchPercent: null, reason: "" })));
      toast({ title: "عرض الوظائف بدون ترتيب المطابقة", variant: "destructive" });
    } finally {
      setMatching(false);
    }
  };

  const list = matches || jobs || [];

  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
        <span className="font-medium text-slate-900 inline-flex items-center gap-2"><Briefcase className="w-4 h-4 text-[#1B4FD8]" /> وظائف مقترحة من السوق السويدي</span>
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"><X className="w-4 h-4" /><span>إغلاق</span></button>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-[300px] shrink-0 border-l border-slate-200 bg-white p-5 flex flex-col">
          <label className="text-sm font-medium text-slate-700 mb-2">كلمات البحث</label>
          <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={3} placeholder="t.ex. Frontend utvecklare React" className="w-full text-[13px] resize-none border border-slate-200 rounded-xl p-3 outline-none focus:border-[#1B4FD8] focus:ring-2 focus:ring-[#1B4FD8]/10" dir="ltr" />
          <p className="text-[11px] text-slate-400 mt-1.5">ملأت تلقائياً من مسمى وظيفتك ومهاراتك</p>

          <label className="text-sm font-medium text-slate-700 mt-4 mb-2">آخر نشر (أيام)</label>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full text-[13px] border border-slate-200 rounded-xl p-2.5 outline-none focus:border-[#1B4FD8]">
            <option value={7}>آخر ٧ أيام</option>
            <option value={14}>آخر ١٤ يوم</option>
            <option value={30}>آخر ٣٠ يوم</option>
          </select>

          <label className="mt-4 flex items-center justify-between text-sm text-slate-700 cursor-pointer">
            <span>العمل عن بُعد فقط</span>
            <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} className="w-4 h-4 accent-[#1B4FD8]" />
          </label>

          <div className="flex-1" />
          <button onClick={search} disabled={fetching || matching || !q.trim()} className="w-full inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-xl bg-[#1B4FD8] text-white hover:bg-[#1640b0] transition-colors disabled:opacity-40">
            {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {fetching ? "نجلب الوظائف..." : "ابحث واطلب"}
          </button>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">المصدر: Arbetsförmedlingen JobTech — فقط وظائف صالحة وغير منتهية.</p>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-100">
          <div className="max-w-2xl mx-auto space-y-3">
            {!list.length && !fetching && !matching && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm pt-24">
                <Sparkles className="w-10 h-10 mb-3 opacity-40" />
                ابحث عن وظائف شاغرة ونطابقها مع سيرتك تلقائياً
              </div>
            )}
            {(fetching || matching) && (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 pt-24">
                <Loader2 className="w-8 h-8 animate-spin text-[#1B4FD8]" />
                <span className="text-sm">{fetching ? "نجلب الوظائف الشاغرة..." : "نطابقها مع سيرتك..."}</span>
              </div>
            )}

            {list.length > 0 && (
              <div className="text-[12px] text-slate-500 px-1">{list.length} إعلان • مرتّبة حسب ملاءمتها لخبراتك</div>
            )}

            {list.map((j) => (
              <div key={j.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 leading-snug">{j.rubrik}</h3>
                    <div className="text-[13px] text-slate-500 mt-0.5">{j.arbetsgivare}</div>
                  </div>
                  {j.matchPercent != null && (
                    <span className={`shrink-0 text-sm font-bold px-2.5 py-1 rounded-full ${j.matchPercent >= 70 ? "bg-emerald-50 text-emerald-700" : j.matchPercent >= 45 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                      {Math.round(j.matchPercent)}%
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px] text-slate-500">
                  {j.kommun && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{j.kommun}{j.lan ? ` (${j.lan})` : ""}</span>}
                  {j.anstallningTyp && <span>{j.anstallningTyp}</span>}
                  {j.varaktighet && <span>{j.varaktighet}</span>}
                  {j.remote && <span className="text-[#1B4FD8]">Remote</span>}
                  {j.deadline && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />Ansök senast {new Date(j.deadline).toLocaleDateString("sv-SE")}</span>}
                </div>
                {j.reason && <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">{j.reason}</p>}
                {j.beskrivning && <p className="text-[12px] text-slate-500 mt-2 leading-relaxed line-clamp-3">{j.beskrivning}</p>}
                {j.webbadress && (
                  <a href={j.webbadress} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[13px] text-[#1B4FD8] hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" /> افتح الإعلان على Platsbanken
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}