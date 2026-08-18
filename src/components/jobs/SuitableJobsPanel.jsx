import { useEffect, useMemo, useState } from "react";
import { Briefcase, ExternalLink, Loader2, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { useServices } from "@/hooks/useServices";

export default function SuitableJobsPanel({ data }) {
  const { jobs: jobsService } = useServices();
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState(false);
  const [days, setDays] = useState(21);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [salary, setSalary] = useState(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [similarJobs, setSimilarJobs] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  const defaultQuery = useMemo(() => [data?.titel, ...(data?.fardigheter || []).map((s) => s?.namn).filter(Boolean).slice(0, 4)].filter(Boolean).join(" "), [data]);

  const search = async () => {
    const q = (query.trim() || defaultQuery).trim();
    if (!q) return;
    setLoading(true);
    try {
      const res = await jobsService.search({ q, remote, publishedDays: days, limit: 20 });
      const list = res?.data?.jobs || [];
      const ranked = await jobsService.rank(data, list.map((j) => ({ id: j.id, rubrik: j.rubrik, arbetsgivare: j.arbetsgivare, plats: [j.kommun, j.lan].filter(Boolean).join(", "), beskrivning: (j.beskrivning || "").slice(0, 700), krav: j.erfarenhetKrav })));
      const byId = Object.fromEntries((ranked?.results || []).map((r) => [r.id, r]));
      setJobs(list.map((j) => ({ ...j, matchPercent: byId[j.id]?.matchPercent || 0, matchReason: byId[j.id]?.reason || "" })).sort((a, b) => b.matchPercent - a.matchPercent));
    } catch { setJobs([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (defaultQuery) search(); }, [defaultQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const showSalary = async (job) => {
    setSelected(job);
    setSalary(null);
    setSimilarJobs([]);
    setSalaryLoading(true);
    setSimilarLoading(true);

    // Background workflow starts immediately from the selected job; CV is optional for similarity.
    const similarPromise = jobsService.findSimilar(job, { publishedDays: 30, limit: 6 });
    const salaryPromise = data ? jobsService.salaryIntelligence({ job, cv: data }) : Promise.resolve(null);

    similarPromise.then((result) => setSimilarJobs(result?.jobs || [])).catch(() => setSimilarJobs([])).finally(() => setSimilarLoading(false));
    salaryPromise.then((result) => setSalary(result?.salary ? { ...result.salary, reason: `مبني على ${result.experienceYears ?? 0} سنة خبرة مرتبطة بالمهنة، وبيانات SCB.`, source: result.sources?.[0]?.name } : null)).catch(() => setSalary(null)).finally(() => setSalaryLoading(false));
  };

  return (
    <aside dir="rtl" className="h-full w-[300px] shrink-0 border-r border-slate-200 bg-white overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-slate-100"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-[#526B35]" /><span className="font-semibold text-sm">Suitable Jobs</span></div><SlidersHorizontal className="w-4 h-4 text-slate-400" /></div>
        <div className="mt-3 flex gap-2"><div className="relative flex-1"><Search className="absolute right-2 top-2.5 w-3.5 h-3.5 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="المهنة أو المهارة" className="w-full text-xs border border-slate-200 rounded-lg py-2 pr-7 pl-2 outline-none focus:border-[#526B35]" /></div><button onClick={search} className="px-2.5 rounded-lg bg-[#526B35] text-white"><Search className="w-3.5 h-3.5" /></button></div>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500"><select value={days} onChange={(e) => setDays(Number(e.target.value))} className="border border-slate-200 rounded px-1.5 py-1 bg-white"><option value={7}>7 أيام</option><option value={21}>21 يوم</option><option value={30}>30 يوم</option></select><label className="inline-flex items-center gap-1"><input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} /> Remote</label></div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : jobs.length === 0 ? <div className="py-12 text-center text-xs text-slate-400">لا توجد نتائج حالياً.</div> : jobs.map((job) => <button key={job.id} onClick={() => showSalary(job)} className="w-full text-right rounded-xl border border-slate-200 p-3 hover:border-[#A8C957] hover:bg-[#F1F6DF]/40 transition-colors"><div className="flex justify-between gap-2"><span className="text-xs font-semibold text-slate-800 line-clamp-2">{job.rubrik}</span><span className="shrink-0 text-[10px] font-bold text-[#526B35]">{Math.round(job.matchPercent)}%</span></div><div className="text-[10px] text-slate-500 mt-1 truncate">{job.arbetsgivare}</div><div className="text-[10px] text-slate-400 mt-1 inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{[job.kommun, job.lan].filter(Boolean).join(", ") || "Sweden"}</div></button>)}
      </div>
      {selected && <div className="absolute left-[300px] top-0 bottom-0 w-[330px] bg-white border-r border-slate-200 shadow-xl z-20 p-4 overflow-y-auto" dir="rtl"><div className="flex justify-between gap-2"><div><h3 className="font-semibold text-sm">{selected.rubrik}</h3><p className="text-xs text-slate-500 mt-1">{selected.arbetsgivare}</p></div><button onClick={() => setSelected(null)}><X className="w-4 h-4 text-slate-400" /></button></div><div className="mt-4 rounded-xl bg-[#F1F6DF] p-3"><div className="text-xs text-[#526B35] font-semibold">Personalized Salary Recommendation</div>{salaryLoading ? <Loader2 className="w-5 h-5 animate-spin mt-2 text-[#526B35]" /> : salary ? <div className="mt-2"><div className="text-xl font-bold text-slate-900">{salary.min ?? "—"} – {salary.max ?? "—"} {salary.currency || "SEK"}</div>{salary.reason && <p className="text-[11px] text-slate-600 mt-1">{salary.reason}</p>}{salary.source && <p className="text-[10px] text-slate-500 mt-2">Källa: {salary.source}</p>}</div> : <p className="text-[11px] text-slate-500 mt-2">لم تتوفر تقديرات كافية.</p>}</div>{selected.matchReason && <p className="text-xs text-slate-600 leading-relaxed mt-4">{selected.matchReason}</p>}
        <div className="mt-5"><div className="text-xs font-semibold text-slate-800">وجدنا لك وظائف مشابهة</div>{similarLoading ? <Loader2 className="w-4 h-4 animate-spin mt-2 text-slate-400" /> : similarJobs.length ? <div className="mt-2 space-y-2">{similarJobs.map((job) => <div key={job.id} className="rounded-lg border border-slate-200 p-2.5"><div className="text-[11px] font-semibold text-slate-800">{job.rubrik}</div><div className="text-[10px] text-slate-500 mt-1">{job.arbetsgivare}</div><div className="text-[10px] text-slate-400 mt-1">{[job.kommun, job.lan].filter(Boolean).join(", ") || "Sweden"}{Number.isFinite(job.distanceKm) ? ` · ${job.distanceKm.toFixed(1)} km` : ""}</div><div className="text-[10px] text-[#526B35] mt-1">{job.similarityPercent ? `${job.similarityPercent}% liknande` : ""}</div></div>)}</div> : <p className="text-[11px] text-slate-400 mt-2">لم نجد وظائف مشابهة إضافية حاليًا.</p>}</div>
        {selected.webbadress && <a href={selected.webbadress} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#526B35]"><ExternalLink className="w-3.5 h-3.5" /> فتح الإعلان</a>}</div>}
    </aside>
  );
}