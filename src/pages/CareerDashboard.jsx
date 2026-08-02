import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useServices } from "@/hooks/useServices";
import { cvKeywords } from "@/lib/jobMatcher";
import StatCard from "@/components/dashboard/StatCard";
import {
  Activity, ShieldCheck, Target, Send, MessageSquare, Trophy, AlertTriangle, GraduationCap,
  FileText, Briefcase, ExternalLink, Sparkles, BarChart3, Loader2,
} from "lucide-react";

const STOP = new Set(["och", "eller", "med", "att", "en", "ett", "som", "av", "till", "for", "har", "ar", "var", "vi", "du", "god", "bra", "sa", "i", "pa", "eller", "och", "sok", "soker"]);
const tokenize = (t) => (t || "").toLowerCase().split(/[^a-zåäö0-9]+/i).filter((x) => x.length > 3 && !STOP.has(x));

function cvStrength(cv) {
  if (!cv) return 0;
  let pts = 0;
  if ((cv.namn || "").trim()) pts += 8;
  if ((cv.titel || "").trim()) pts += 8;
  const k = cv.kontakt || {};
  const contactFields = [k.epost, k.telefon, k.adress, k.linkedin].filter(Boolean).length;
  pts += Math.min(contactFields, 3) * 5;
  const profil = (cv.profil || "").trim();
  if (profil.length > 40) pts += 15; else if (profil) pts += 8;
  const exp = (cv.erfarenhet || []).filter((e) => (e.roll || "").trim() || (e.beskrivning || "").trim());
  if (exp.length >= 1) pts += 12;
  if (exp.length >= 3) pts += 8;
  const edu = (cv.utbildning || []).filter((u) => (u.examen || "").trim());
  if (edu.length >= 1) pts += 10;
  const skills = (cv.fardigheter || []).filter((s) => (s.namn || "").trim());
  if (skills.length >= 3) pts += 14; else if (skills.length) pts += 7;
  if ((cv.sprak || []).filter((s) => (s.sprak || "").trim()).length >= 1) pts += 10;
  return Math.min(100, pts);
}

function ringColor(v) {
  if (v >= 75) return "#16a34a";
  if (v >= 50) return "#f59e0b";
  return "#ef4444";
}

export default function CareerDashboard() {
  const { toast } = useToast();
  const { auth, cvRepository, applications, jobs: jobsService, llm } = useServices();
  const [me, setMe] = useState(null);
  const [savedCVs, setSavedCVs] = useState([]);
  const [applicationsList, setApplicationsList] = useState([]);
  const [ats, setAts] = useState(null);
  const [jobs, setJobs] = useState(null);
  const [courses, setCourses] = useState(null);
  const [loadingMap, setLoadingMap] = useState({});
  const didInit = useRef(false);

  const setLoading = (k, v) => setLoadingMap((m) => ({ ...m, [k]: v }));

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    (async () => {
      try { setMe(await auth.me()); } catch { setMe(null); }
      const [cvs, apps] = await Promise.all([
        cvRepository.list("-updated_date", 6).catch(() => []),
        applications.list("-updated_date", 100).catch(() => []),
      ]);
      setSavedCVs(cvs || []);
      setApplicationsList(apps || []);
      const mainCV = (cvs && cvs[0] && cvs[0].data) || null;
      if (mainCV) {
        runATS(mainCV);
        runJobs(mainCV);
      }
    })().catch(() => {});
    // realtime auto-update for applications
    const unsub = base44.entities.JobApplication.subscribe(() => {
      applications.list("-updated_date", 100).then(setApplicationsList).catch(() => {});
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runATS = async (cv) => {
    setLoading("ats", true);
    try { setAts(await llm.atsAnalyze(cv)); }
    catch { toast({ title: "تعذّر حساب نقاط ATS", variant: "destructive" }); }
    finally { setLoading("ats", false); }
  };

  const runJobs = async (cv) => {
    setLoading("jobs", true);
    const parts = [];
    if (cv.titel) parts.push(cv.titel);
    parts.push(...(cv.fardigheter || []).map((s) => s.namn).filter(Boolean).slice(0, 5));
    const q = parts.join(" ").trim();
    if (!q) { setJobs([]); setLoading("jobs", false); return; }
    try {
      const res = await jobsService.search({ q, publishedDays: 21, limit: 20 });
      const list = res.data?.jobs || [];
      const inputs = list.map((j) => ({ id: j.id, rubrik: j.rubrik, arbetsgivare: j.arbetsgivare, plats: [j.kommun, j.lan].filter(Boolean).join(", "), beskrivning: (j.beskrivning || "").slice(0, 500), krav: j.erfarenhetKrav }));
      const rankRes = await jobsService.rank(cv, inputs);
      const byId = {};
      (rankRes.results || []).forEach((r) => { byId[r.id] = r; });
      const ranked = list.map((j) => ({ ...j, matchPercent: byId[j.id]?.matchPercent ?? 0 })).sort((a, b) => (b.matchPercent || 0) - (a.matchPercent || 0));
      setJobs(ranked);
      runCourses(cv, ranked);
    } catch { setJobs([]); toast({ title: "تعذّر جلب الوظائف الموصى بها", variant: "destructive" }); }
    finally { setLoading("jobs", false); }
  };

  const runCourses = async (cv, rankedJobs, atsResult = null) => {
    const ks = new Set(cvKeywords(cv));
    (cv.fardigheter || []).forEach((f) => f?.namn && ks.add(f.namn.toLowerCase()));
    const freq = {};
    rankedJobs.slice(0, 6).forEach((j) => {
      tokenize(`${j.rubrik || ""} ${j.beskrivning || ""}`).forEach((t) => { if (!ks.has(t)) freq[t] = (freq[t] || 0) + 1; });
    });
    const weak = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
    if (atsResult?.weaknesses?.length) weak.push(...atsResult.weaknesses.slice(0, 2).map((w) => w.toLowerCase().slice(0, 30)));
    if (!weak.length) { setCourses([]); return; }
    setLoading("courses", true);
    try { setCourses(await llm.recommendCourses({ jobTitle: cv.titel, weakSkills: [...new Set(weak)] })); }
    catch { setCourses([]); }
    finally { setLoading("courses", false); }
  };

  const mainCV = (savedCVs[0] && savedCVs[0].data) || null;
  const sent = applicationsList.filter((a) => a.status !== "saved");
  const applicationsSent = sent.length;
  const interviews = applicationsList.filter((a) => a.status === "interview" || a.status === "offer").length;
  const offers = applicationsList.filter((a) => a.status === "offer").length;
  const interviewRate = applicationsSent ? Math.round((interviews / applicationsSent) * 100) : 0;
  const offerRate = applicationsSent ? Math.round((offers / applicationsSent) * 100) : 0;
  const strength = cvStrength(mainCV);
  const atsScore = ats ? Math.round(ats.overallScore || 0) : null;
  const matchAvg = jobs && jobs.length ? Math.round(jobs.reduce((s, j) => s + (j.matchPercent || 0), 0) / jobs.length) : null;
  const weakSkills = (() => {
    if (!mainCV) return [];
    const ks = new Set(cvKeywords(mainCV));
    (mainCV.fardigheter || []).forEach((f) => f?.namn && ks.add(f.namn.toLowerCase()));
    const freq = {};
    (jobs || []).slice(0, 6).forEach((j) => tokenize(`${j.rubrik || ""} ${j.beskrivning || ""}`).forEach((t) => { if (!ks.has(t)) freq[t] = (freq[t] || 0) + 1; }));
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
  })();

  const Ring = ({ value }) => {
    const v = value ?? 0;
    const c = ringColor(v);
    return (
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke={c} strokeWidth="3" strokeDasharray={`${v} 100`} pathLength="100" strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[15px] font-bold text-slate-900 tabular-nums">{value == null ? "—" : `${v}%`}</div>
      </div>
    );
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 pb-16">
      <div className="max-w-6xl mx-auto px-5 pt-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#1B4FD8] flex items-center justify-center"><BarChart3 className="w-5 h-5 text-white" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">لوحة المسار المهني</h1>
            <p className="text-[12px] text-slate-500">نظرة شاملة على قوة سيرتك، نشاطك في التقديم، والسوق السويدي — تتحدّث تلقائياً.</p>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard icon={Activity} label="قوة السيرة" value={`${strength}%`} sub={mainCV ? "بناءً على اكتمال الأقسام" : "لا توجد سيرة محفوظة"} tone={strength >= 75 ? "emerald" : strength >= 50 ? "amber" : "rose"} />
          <StatCard icon={ShieldCheck} label="نقاط ATS" value={atsScore == null ? "—" : `${atsScore}%`} loading={loadingMap.ats} sub="توافق الأنظمة الآلية" tone="blue" />
          <StatCard icon={Target} label="متوسط المطابقة" value={matchAvg == null ? "—" : `${matchAvg}%`} loading={loadingMap.jobs} sub="مع الوظائف الموصى بها" tone="violet" />
          <StatCard icon={Send} label="طلبات أُرسلت" value={applicationsSent} sub={`من ${applicationsList.length} متابعة`} tone="slate" />
          <StatCard icon={MessageSquare} label="معدّل المقابلات" value={`${interviewRate}%`} sub={`${interviews} مقابلة`} tone="amber" />
          <StatCard icon={Trophy} label="معدّل العروض" value={`${offerRate}%`} sub={`${offers} عرض`} tone="emerald" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Latest Saved CVs */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 inline-flex items-center gap-1.5"><FileText className="w-4 h-4 text-[#1B4FD8]" /> السير المحفوظة الأخيرة</h2>
            {savedCVs.length === 0 ? (
              <Empty text="لم تحفظ أي سيرة بعد. أنشئ واحدة من البانيّة." to="/builder" cta="ابدأ بناء سيرة" />
            ) : (
              <div className="space-y-2">
                {savedCVs.slice(0, 4).map((cv) => (
                  <Link key={cv.id} to={`/builder/${cv.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 hover:border-[#1B4FD8] hover:bg-slate-50 p-3 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-[#1B4FD8]/10 flex items-center justify-center shrink-0"><FileText className="w-4 h-4 text-[#0f3db0]" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-slate-800 truncate">{cv.titel || cv.data?.titel || "سيرة بدون عنوان"}</div>
                      <div className="text-[11px] text-slate-400">{cv.data?.namn || ""} {cv.updated_date ? `• ${new Date(cv.updated_date).toLocaleDateString("sv-SE")}` : ""}</div>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-500">{cvStrength(cv.data)}%</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Recommended Jobs */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 inline-flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-[#1B4FD8]" /> وظائف موصى بها</h2>
            {!mainCV ? (
              <Empty text="احفظ سيرتك أولاً لنقترح وظائف تناسبك." to="/builder" cta="ابدأ بناء سيرة" />
            ) : loadingMap.jobs && !jobs ? (
              <Center label="نطابق الوظائف مع سيرتك..." />
            ) : jobs && jobs.length ? (
              <div className="space-y-2">
                {jobs.slice(0, 4).map((j) => (
                  <div key={j.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-slate-800 truncate">{j.rubrik}</div>
                      <div className="text-[11px] text-slate-400 truncate">{j.arbetsgivare} {j.kommun ? `• ${j.kommun}` : ""}</div>
                    </div>
                    <span className={`text-[12px] font-bold px-2 py-1 rounded-full ${(j.matchPercent || 0) >= 70 ? "bg-emerald-50 text-emerald-700" : (j.matchPercent || 0) >= 45 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{Math.round(j.matchPercent || 0)}%</span>
                    {j.webbadress && <a href={j.webbadress} target="_blank" rel="noreferrer" className="text-[#1B4FD8]"><ExternalLink className="w-3.5 h-3.5" /></a>}
                  </div>
                ))}
              </div>
            ) : <Center label="لا توجد وظائف مطابقة حالياً" />}
          </section>

          {/* Weak Skills */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-1 inline-flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-500" /> مهارات للتحسين</h2>
            <p className="text-[11px] text-slate-400 mb-3">كلمات مفتاحية يطلبها السوق وليست في سيرتك.</p>
            {!mainCV ? <Center label="احفظ سيرتك لاستنتاج الفجوات." /> : loadingMap.jobs ? <Center label="نحلّل متطلبات السوق..." /> : weakSkills.length ? (
              <div className="flex flex-wrap gap-1.5">
                {weakSkills.map((s) => <span key={s} className="text-[12px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">{s}</span>)}
              </div>
            ) : <Center label="تغطّي مهاراتك متطلبات الوظائف المعروضة." />}
            {ats?.weaknesses?.length > 0 && (
              <>
                <div className="text-[11px] text-slate-400 mt-4 mb-1.5">نقاط ضعف رصدتها تحليل ATS:</div>
                <ul className="space-y-1">
                  {ats.weaknesses.slice(0, 3).map((w, i) => <li key={i} className="text-[12px] text-slate-600 leading-relaxed flex gap-1.5"><span className="text-rose-400">•</span>{w}</li>)}
                </ul>
              </>
            )}
          </section>

          {/* Recommended Courses */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 inline-flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-violet-600" /> دورات موصى بها</h2>
            {loadingMap.courses ? <Center label="نختار دورات مناسبة..." /> : courses && courses.length ? (
              <div className="space-y-2">
                {courses.slice(0, 5).map((c, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[13px] font-medium text-slate-800">{c.title}</div>
                      {c.level && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700">{c.level}</span>}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{c.provider}</div>
                    {c.reason && <p className="text-[12px] text-slate-600 mt-1 leading-relaxed">{c.reason}</p>}
                    {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="text-[12px] text-[#1B4FD8] inline-flex items-center gap-1 mt-1.5"><ExternalLink className="w-3 h-3" /> افتح الدورة</a>}
                  </div>
                ))}
              </div>
            ) : courses?.length === 0 ? <Center label="لا توجد توصيات حالياً." /> : <Center label="تحليل الفجوات يحدّد الدورات المناسبة." />}
          </section>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-8 inline-flex items-center gap-1 justify-center w-full"><Sparkles className="w-3 h-3" /> تتحدّث اللوحة تلقائياً عند حفظ سيرة أو تغيير حالة طلب.</p>
      </div>
    </div>
  );
}

function Center({ label }) {
  return <div className="py-10 flex flex-col items-center gap-2 text-slate-400 text-[13px]"><Loader2 className="w-5 h-5 animate-spin opacity-50" />{label}</div>;
}
function Empty({ text, to, cta }) {
  return (
    <div className="py-8 flex flex-col items-center gap-3 text-center">
      <p className="text-[13px] text-slate-500">{text}</p>
      <Link to={to} className="text-[13px] px-4 py-2 rounded-xl bg-[#1B4FD8] text-white hover:bg-[#0f3db0]">{cta}</Link>
    </div>
  );
}