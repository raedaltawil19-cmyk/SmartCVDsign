import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useServices } from "@/hooks/useServices";
import { cvKeywords } from "@/lib/jobMatcher";
import { X, Loader2, GraduationCap, Search, ExternalLink, Sparkles, Clock, BadgeCheck, ShieldCheck, TrendingUp, Briefcase } from "lucide-react";

const STOP = new Set(["och", "eller", "med", "att", "en", "ett", "som", "av", "till", "for", "har", "ar", "var", "vi", "du", "god", "bra", "sa", "i", "pa", "sok", "soker", "jobb", "eller", "och"]);
const tokenize = (t) => (t || "").toLowerCase().split(/[^a-zåäö0-9]+/i).filter((x) => x.length > 3 && !STOP.has(x));
const buildQuery = (cv, title) => {
  const parts = [];
  if (title || cv?.titel) parts.push(title || cv.titel);
  parts.push(...(cv?.fardigheter || []).map((s) => s.namn).filter(Boolean).slice(0, 5));
  return parts.join(" ").trim();
};

const TYPE_STYLE = {
  Yrkeshögskola: "bg-violet-50 text-violet-700 border-violet-100",
  Arbetsförmedlingen: "bg-[#1B4FD8]/8 text-[#0f3db0] border-[#1B4FD8]/15",
  Komvux: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Folkhögskola: "bg-amber-50 text-amber-700 border-amber-100",
  "Distans/Online": "bg-slate-100 text-slate-600 border-slate-200",
};

export default function CourseAdvisorModal({ data, onClose }) {
  const { toast } = useToast();
  const { llm, jobs: jobsService } = useServices();
  const [title, setTitle] = useState(data?.titel || "");
  const [phase, setPhase] = useState("");
  const [running, setRunning] = useState(false);
  const [courses, setCourses] = useState(null);
  const [currentMatch, setCurrentMatch] = useState(null);

  const run = async () => {
    if (!buildQuery(data, title).trim()) { toast({ title: "أدخل المسمى الوظيفي المستهدف", variant: "destructive" }); return; }
    setRunning(true); setCourses(null); setCurrentMatch(null);
    try {
      setPhase("نجلب الوظائف المطابقة...");
      const q = buildQuery(data, title);
      const res = await jobsService.search({ q, publishedDays: 21, limit: 18 });
      const list = res.data?.jobs || [];

      let ranked = list;
      if (list.length) {
        setPhase("نطابقها مع سيرتك...");
        const inputs = list.map((j) => ({ id: j.id, rubrik: j.rubrik, arbetsgivare: j.arbetsgivare, plats: [j.kommun, j.lan].filter(Boolean).join(", "), beskrivning: (j.beskrivning || "").slice(0, 500), krav: j.erfarenhetKrav }));
        const rankRes = await jobsService.rank(data, inputs);
        const byId = {};
        (rankRes.results || []).forEach((r) => { byId[r.id] = r; });
        ranked = list.map((j) => ({ ...j, matchPercent: byId[j.id]?.matchPercent ?? 0 })).sort((a, b) => (b.matchPercent || 0) - (a.matchPercent || 0));
        const avg = Math.round(ranked.reduce((s, j) => s + (j.matchPercent || 0), 0) / ranked.length);
        setCurrentMatch(avg);
      }

      // derive weak skills (market asks but CV lacks)
      const ks = new Set(cvKeywords(data));
      (data?.fardigheter || []).forEach((f) => f?.namn && ks.add(f.namn.toLowerCase()));
      const freq = {};
      ranked.slice(0, 6).forEach((j) => tokenize(`${j.rubrik || ""} ${j.beskrivning || ""}`).forEach((t) => { if (!ks.has(t)) freq[t] = (freq[t] || 0) + 1; }));
      const weak = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);

      setPhase("نقترح دورات سويدية مجانية من السوق...");
      const ads = ranked.slice(0, 8).map((j) => ({ rubrik: j.rubrik, arbetsgivare: j.arbetsgivare, plats: [j.kommun, j.lan].filter(Boolean).join(", "), matchPercent: j.matchPercent }));
      const out = await llm.recommendSwedishCourses({ cv: data, jobTitle: title || data?.titel, weakSkills: weak, currentMatch, jobAds: ads });
      setCourses(out);
      if (!out.length) toast({ title: "لم نجد دورات مطابقة حالياً", description: "جرّب مسمى وظيفي آخر." });
    } catch (e) {
      toast({ title: "تعذّر إنشاء التوصيات", variant: "destructive" });
    } finally {
      setRunning(false); setPhase("");
    }
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-slate-900/80 flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
        <span className="font-medium text-slate-900 inline-flex items-center gap-2"><GraduationCap className="w-4 h-4 text-[#1B4FD8]" /> مستشار الدورات المجانية — السوق السويدي</span>
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"><X className="w-4 h-4" /> إغلاق</button>
      </div>

      <div className="flex-1 overflow-auto bg-slate-100">
        <div className="max-w-2xl mx-auto p-6 space-y-5">
          {/* Intro + role input */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-start gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#1B4FD8] mt-0.5" />
              <p className="text-[13px] text-slate-600 leading-relaxed">
                نحلل سيرتك ونبحث عن الوظائف السويدية المطابقة لها، ثم نقترح دورات <b>مجانية حصريةً من السوق السويد</b> (Arbetsförmedlingen / Yrkeshögskola / Komvux) مدتها حتى ١٢ شهراً، ونوضّح لكل دورة أثرها المتوقع على فرصتك في التوظيف.
              </p>
            </div>
            <label className="text-sm font-medium text-slate-700 mb-1.5">المسمى الوظيفي المستهدف</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="t.ex. Frontend utvecklare"
              className="w-full text-[13px] border border-slate-200 rounded-xl p-2.5 outline-none focus:border-[#1B4FD8] focus:ring-2 focus:ring-[#1B4FD8]/10"
              dir="ltr"
            />
            <button
              onClick={run}
              disabled={running}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-xl bg-[#1B4FD8] text-white hover:bg-[#0f3db0] transition-colors disabled:opacity-50"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {running ? phase : "حلّل سيرتي واقترح دورات"}
            </button>
          </div>

          {/* Current match line */}
          {currentMatch != null && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 inline-flex items-center gap-2 w-full">
              <Briefcase className="w-4 h-4 text-[#1B4FD8]" />
              <span className="text-[12px] text-slate-600">مطابقة سيرتك الحالية مع الوظائف المقترحة: <b className="text-slate-900">{currentMatch}%</b> — الدورات أدناه ترفع هذه النسبة.</span>
            </div>
          )}

          {/* Results */}
          {running && !courses && (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center gap-2 text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin text-[#1B4FD8]" />
              <span className="text-[13px]">{phase}</span>
            </div>
          )}

          {courses && courses.length > 0 && (
            <div className="space-y-3">
              {courses.map((c, i) => {
                const cur = Math.round(c.currentRank ?? currentMatch ?? 0);
                const tgt = Math.round(c.targetRank ?? cur);
                const gain = Math.max(0, tgt - cur);
                return (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 leading-snug">{c.title}</h3>
                        <div className="text-[12px] text-slate-500 mt-0.5">{c.provider}</div>
                      </div>
                      <span className={`shrink-0 text-[11px] px-2 py-1 rounded-full border ${TYPE_STYLE[c.type] || TYPE_STYLE["Distans/Online"]}`}>{c.type}</span>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2.5 text-[12px] text-slate-500">
                      {c.durationText && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{c.durationText}</span>}
                      {c.isFree && <span className="inline-flex items-center gap-1 text-emerald-600"><BadgeCheck className="w-3 h-3" />مجانية</span>}
                      {c.leadsToCert && <span className="inline-flex items-center gap-1 text-violet-600"><ShieldCheck className="w-3 h-3" />شهادة/ экзамен</span>}
                      {c.weeks ? `· ≈ ${c.weeks} أسبوع` : ""}
                    </div>

                    {c.reason && <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">{c.reason}</p>}

                    {/* impact bar */}
                    <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-700 mb-2"><TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> الأثر المتوقع على فرصة التوظيف</div>
                      <div className="flex items-center gap-2 text-[12px]">
                        <span className="text-slate-500">الحالي</span>
                        <span className="font-bold text-slate-700 tabular-nums">{cur}%</span>
                        <span className="text-slate-300">←</span>
                        <span className="text-emerald-600 font-bold tabular-nums">{tgt}%</span>
                        <span className="text-emerald-600">(+{gain})</span>
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${tgt}%` }} />
                        </div>
                      </div>
                      {c.employmentImpact && <p className="text-[12px] text-slate-600 mt-2 leading-relaxed">{c.employmentImpact}</p>}
                    </div>

                    {c.url && (
                      <a href={c.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[13px] text-[#1B4FD8] hover:underline">
                        <ExternalLink className="w-3.5 h-3.5" /> افتح صفحة الدورة / التقديم
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {courses && courses.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-[13px]">
              لا توجد دورات مطابقة في الوقت الحالي. جرّب مسمى وظيفي أدق.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}