import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/AuthContext";
import useCareerRepositioning from "@/lib/repositioning/useCareerRepositioning";
import { repositioningFingerprint } from "@/lib/repositioning/contract";
import CareerPathCard from "@/components/repositioning/CareerPathCard";
import OpportunityCard from "@/components/repositioning/OpportunityCard";
import { ArrowRight, Loader2, Compass, RefreshCcw } from "lucide-react";

/**
 * صفحة نتائج إعادة التموضع المهني — عرض فقط.
 * لا تُشغّل تحليلاً ولا تعدّل سيرة؛ التشغيل يحدث عند اعتماد نسخة في Builder.
 */
export default function CareerPaths() {
  const navigate = useNavigate();
  const { dir, lang } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [latestCV, setLatestCV] = useState(null);
  const repositioning = useCareerRepositioning({ cvId: latestCV?.id, data: latestCV?.data, isAuthenticated, uiLanguage: lang });
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [running, setRunning] = useState(false);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await base44.entities.SavedCV.list("-updated_date", 1000);
        setLatestCV(saved?.[0] || null);
        const rows = await base44.entities.RepositioningAnalysis.list("-created_date", 10);
        const ready = rows.find((r) => r.status === "ready");
        setRunning(rows.some((r) => r.status === "running"));
        setAnalysis(ready || null);
        if (ready) {
          const versions = await base44.entities.SavedCV.list("-updated_date", 1000);
          const fp = repositioningFingerprint({ approvedCvId: ready.cvId, versions });
          setStale(fp !== ready.cvFingerprint);
        }
      } catch {
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openTailor = (job) => {
    if (!analysis?.cvId) return;
    navigate(`/builder/${analysis.cvId}`, { state: { cvId: analysis.cvId, openTailor: true, tailorJobTitle: job.title, tailorJob: {
      title: job.title,
      company: job.company,
      location: job.location,
      url: job.url,
      description: job.description || job.beskrivning || job.summary || "",
      requirements: job.requirements || { mandatory: job.mandatoryRequirements || [] },
      salary: job.salary || null
    } } });
  };

  const result = analysis?.result || null;

  return (
    <div dir={dir} className="min-h-screen bg-[#F5F5F5] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="max-w-4xl mx-auto h-14 px-4 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-10 h-10 rounded-full hover:bg-slate-100 grid place-items-center text-slate-600" aria-label="رجوع">
            <ArrowRight className="w-5 h-5" />
          </button>
          <Compass className="w-4 h-4 text-[#000066]" />
          <h1 className="text-sm font-semibold">مسارات وفرص مهنية</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {loading && (
          <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل…</div>
        )}

        {!loading && !result && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-600 space-y-4">
            <div>{running
              ? "نعمل الآن على تحليل نسخ سيرتك المعتمدة. سنُشعرك عند وجود نتائج مفيدة."
              : "لا توجد نتائج بعد. يمكنك طلب اكتشاف المسارات المهنية الآن."}</div>
            {latestCV && !running && (
              <button
                onClick={() => repositioning.runManual()}
                className="min-h-10 px-4 rounded-xl bg-[#000066] text-white text-[12px] font-semibold inline-flex items-center gap-2"
              >
                <Compass className="w-4 h-4" /> اكتشف المسارات المهنية الآن
              </button>
            )}
          </div>
        )}

        {!loading && result && (
          <div className="flex justify-end">
            <button
              onClick={() => repositioning.runManual()}
              disabled={running}
              className="min-h-10 px-4 rounded-xl bg-[#000066] text-white text-[12px] font-semibold inline-flex items-center gap-2 disabled:opacity-50"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              {running ? "جارٍ التحليل…" : "اكتشف مسارات مهنية جديدة"}
            </button>
          </div>
        )}

        {!loading && result && (
          <>
            {stale && (
              <div className="bg-amber-50 border border-amber-100 text-amber-900 rounded-2xl p-3 text-[12px] inline-flex items-center gap-2">
                <RefreshCcw className="w-3.5 h-3.5" />
                هذه النتيجة مبنية على نسخة أقدم من سيرتك. اعتمد نسختك الأحدث (حفظ أو طباعة) لإعادة التحليل.
              </div>
            )}

            {result.professionalProfile?.summary && (
              <section className="bg-white border border-slate-200 rounded-2xl p-4">
                <h2 className="text-sm font-semibold mb-1.5">ملفك المهني الموحد</h2>
                <p className="text-[13px] leading-relaxed text-slate-600 text-justify">{result.professionalProfile.summary}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-slate-500">
                  {result.professionalProfile.seniority && <span>المستوى: {result.professionalProfile.seniority}</span>}
                  {result.professionalProfile.baseLocation && <span>الموقع: {result.professionalProfile.baseLocation}</span>}
                </div>
              </section>
            )}

            {result.capabilities?.length > 0 && (
              <section className="bg-white border border-slate-200 rounded-2xl p-4">
                <h2 className="text-sm font-semibold mb-2">قدراتك المؤكدة</h2>
                <div className="flex flex-wrap gap-1.5">
                  {result.capabilities.map((c) => (
                    <span key={c.id || c.label} title={c.evidence?.[0]?.quote || ""} className="text-[11px] px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700">
                      {c.label}{c.strength === "weak" ? " (دليل محدود)" : ""}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {result.paths?.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold">المسارات المهنية المقترحة</h2>
                {result.paths.map((p) => <CareerPathCard key={p.id || p.label} path={p} />)}
              </section>
            )}

            {result.opportunities?.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold">فرص حقيقية متاحة</h2>
                {result.searchScope?.note && <p className="text-[12px] text-slate-500">{result.searchScope.note}</p>}
                {result.opportunities.map((j) => <OpportunityCard key={j.id || j.url} job={j} onTailor={openTailor} />)}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}