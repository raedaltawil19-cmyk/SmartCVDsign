import { useCallback, useEffect, useState } from "react";
import { BookOpen, ExternalLink, MapPin, Clock3, CalendarDays, Languages, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useServices } from "@/hooks/useServices";

export default function RecommendedCourses() {
  const { courses } = useServices();
  const [items, setItems] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try { setItems(await courses.list(100)); } catch { setItems([]); }
  }, [courses]);

  useEffect(() => { load(); }, [load]);

  const openCourse = async (item) => {
    if (item.isNew) {
      setBusyId(item.id);
      try {
        await courses.markSeen(item.id);
        setItems((prev) => (prev || []).map((x) => x.id === item.id ? { ...x, isNew: false } : x));
      } finally { setBusyId(null); }
    }
    window.open(item.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#F5F5F5] text-slate-900" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/builder" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="w-4 h-4" /> العودة</Link>
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-[#526B35]" /><span className="font-semibold">الدورات الموصى بها</span></div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-5 py-8">
        <div className="mb-6"><h1 className="text-2xl font-semibold">Recommended Courses</h1><p className="text-sm text-slate-500 mt-1">دورات مرتبطة بالمهارات والمهن المستهدفة في ملفك.</p></div>
        {items === null ? <div className="py-20 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div> : items.length === 0 ? <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-sm text-slate-400">لا توجد دورات موصى بها حالياً.</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((c) => (
              <article key={c.id} className={`bg-white rounded-2xl border p-5 ${c.isNew ? "border-[#A8C957] ring-1 ring-[#A8C957]/30" : "border-slate-200"}`}>
                <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900 leading-snug">{c.title}</h2><p className="text-xs text-slate-500 mt-1">{c.provider}</p></div>{c.isNew && <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[#F1F6DF] text-[#526B35]">جديدة</span>}</div>
                <div className="flex flex-wrap gap-2 mt-4 text-[11px] text-slate-600">
                  {c.type && <span className="px-2 py-1 rounded-lg bg-slate-50">{c.type}</span>}
                  {c.location && <span className="px-2 py-1 rounded-lg bg-slate-50 inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{c.location}{typeof c.distanceKm === "number" ? ` • ${c.distanceKm} km` : ""}</span>}
                  {c.durationText && <span className="px-2 py-1 rounded-lg bg-slate-50 inline-flex items-center gap-1"><Clock3 className="w-3 h-3" />{c.durationText}</span>}
                  {c.startDate && <span className="px-2 py-1 rounded-lg bg-slate-50 inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" />{c.startDate}</span>}
                  {c.language && <span className="px-2 py-1 rounded-lg bg-slate-50 inline-flex items-center gap-1"><Languages className="w-3 h-3" />{c.language}</span>}
                  {typeof c.price === "number" && <span className="px-2 py-1 rounded-lg bg-slate-50">{c.price} {c.currency || "SEK"}</span>}
                </div>
                {c.reason && <p className="text-sm text-slate-600 leading-relaxed mt-4">{c.reason}</p>}
                {c.targetSkills?.length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">{c.targetSkills.map((s) => <span key={s} className="text-[10px] px-2 py-1 rounded-full bg-[#F1F6DF] text-[#526B35]">{s}</span>)}</div>}
                <button onClick={() => openCourse(c)} disabled={busyId === c.id} className="mt-5 inline-flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl bg-[#526B35] text-white hover:bg-[#40542a] disabled:opacity-50"><ExternalLink className="w-4 h-4" /> فتح الدورة</button>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}