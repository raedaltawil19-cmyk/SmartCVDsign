import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { emptyCV, mergeCV, DEFAULT_LAYOUTS } from "@/lib/cvModel";
import { useToast } from "@/components/ui/use-toast";
import { useServices } from "@/hooks/useServices";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/AuthContext";
import CVPreview from "@/components/CVPreview";
import CVAgent from "@/components/CVAgent";
import CVSideToolbar from "@/components/tools/CVSideToolbar";
import LayoutEditor from "@/components/tools/LayoutEditor";
import { ArrowRight, Download, Loader2, Eye, LayoutGrid, Save } from "lucide-react";
import CVSaveDialog from "@/components/tools/CVSaveDialog";

const A4_W = 794;
const A4_H = 1123;

export default function Builder() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cvId: paramCvId } = useParams();
  const { toast } = useToast();
  const { dir, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { llm, cvRepository, auth, export: exportSvc } = useServices();
  const incoming = location.state;

  const [data, setData] = useState(emptyCV);
  const [templateId, setTemplateId] = useState(incoming?.templateId || "stockholm");
  const [layout, setLayout] = useState(() => DEFAULT_LAYOUTS[incoming?.templateId || "stockholm"] || DEFAULT_LAYOUTS.stockholm);
  const [showLayout, setShowLayout] = useState(false);
  const [processing, setProcessing] = useState(!!(incoming?.text || incoming?.fileUrl));
  const [regenerating, setRegenerating] = useState(false);
  const [mode, setMode] = useState("preview");
  const [agentOpen, setAgentOpen] = useState(false);
  const panelRef = useRef(null);
  const [scale, setScale] = useState(0.6);
  const [currentCvId, setCurrentCvId] = useState(incoming?.cvId || paramCvId || null);
  const [saving, setSaving] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(false);

  const nextUrl = () => window.location.pathname + window.location.search;
  const guard = () => auth.requireAuth({ draft: { data, templateId, layout }, nextUrl: nextUrl() });

  useEffect(() => {
    setLayout(DEFAULT_LAYOUTS[templateId] || DEFAULT_LAYOUTS.stockholm);
  }, [templateId]);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const update = () => setScale(Math.max(0.3, Math.min(1, (el.clientWidth - 120) / A4_W)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const runProcess = useCallback(async (text, fileUrl) => {
    setProcessing(true);
    try {
      const merged = await llm.processCV({ text, fileUrl });
      setData(merged);
    } catch (e) {
      toast({ title: "Kunde inte läsa in informationen", description: "Försök igen eller redigera manuellt.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  }, [toast, llm]);

  useEffect(() => {
    if (incoming?.text || incoming?.fileUrl) {
      runProcess(incoming.text || "", incoming.fileUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = incoming?.cvId || paramCvId;
    if (!id || incoming?.text || incoming?.fileUrl) return;
    (async () => {
      setProcessing(true);
      try {
        const rec = await cvRepository.get(id);
        if (rec) {
          if (rec.data) setData(mergeCV(rec.data));
          if (rec.templateId) setTemplateId(rec.templateId);
          if (rec.layout) setLayout(rec.layout);
          setCurrentCvId(rec.id);
        }
      } catch (e) {
        toast({ title: "تعذّر تحميل السيرة المحفوظة", variant: "destructive" });
      } finally {
        setProcessing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (incoming?.text || incoming?.fileUrl || incoming?.cvId || paramCvId) return;
    const p = auth.restoreDraft();
    if (!p) return;
    try {
      if (p.data) setData(mergeCV(p.data));
      if (p.templateId) setTemplateId(p.templateId);
      if (p.layout) setLayout(p.layout);
      toast({ title: "أكمل ما بدأته", description: "تمت استعادة مسودة سيرتك بعد تسجيل الدخول." });
    } catch (e) {}
    auth.clearDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const setContact = (k, v) => setData((d) => ({ ...d, kontakt: { ...d.kontakt, [k]: v } }));
  const setExp = (i, k, v) => setData((d) => { const a = [...d.erfarenhet]; a[i] = { ...a[i], [k]: v }; return { ...d, erfarenhet: a }; });
  const setEdu = (i, k, v) => setData((d) => { const a = [...d.utbildning]; a[i] = { ...a[i], [k]: v }; return { ...d, utbildning: a }; });
  const setSkill = (i, k, v) => setData((d) => { const a = [...d.fardigheter]; a[i] = { ...a[i], [k]: k === "niva" ? Number(v) : v }; return { ...d, fardigheter: a }; });
  const setSprak = (i, k, v) => setData((d) => { const a = [...d.sprak]; a[i] = { ...a[i], [k]: v }; return { ...d, sprak: a }; });
  const addExp = () => setData((d) => ({ ...d, erfarenhet: [...d.erfarenhet, { roll: "", foretag: "", period: "", beskrivning: "" }] }));
  const removeExp = (i) => setData((d) => ({ ...d, erfarenhet: d.erfarenhet.filter((_, x) => x !== i) }));
  const addEdu = () => setData((d) => ({ ...d, utbildning: [...d.utbildning, { examen: "", skola: "", period: "", beskrivning: "" }] }));
  const removeEdu = (i) => setData((d) => ({ ...d, utbildning: d.utbildning.filter((_, x) => x !== i) }));
  const addSkill = () => setData((d) => ({ ...d, fardigheter: [...d.fardigheter, { namn: "", niva: 80 }] }));
  const removeSkill = (i) => setData((d) => ({ ...d, fardigheter: d.fardigheter.filter((_, x) => x !== i) }));
  const addSprak = () => setData((d) => ({ ...d, sprak: [...d.sprak, { sprak: "", niva: "" }] }));
  const removeSprak = (i) => setData((d) => ({ ...d, sprak: d.sprak.filter((_, x) => x !== i) }));

  const actions = { setField, setContact, setExp, setEdu, setSkill, setSprak, addExp, removeExp, addEdu, removeEdu, addSkill, removeSkill, addSprak, removeSprak };

  const exportPDF = async () => {
    setAuthChecking(true);
    const ok = await guard();
    setAuthChecking(false);
    if (ok) exportSvc.print();
  };

  // Print gate: block native print / Ctrl+P when not authenticated.
  const authedRef = useRef(isAuthenticated);
  authedRef.current = isAuthenticated;
  const tRef = useRef(t);
  tRef.current = t;
  const exportRef = useRef(exportPDF);
  exportRef.current = exportPDF;

  useEffect(() => {
    const onBeforePrint = () => {
      if (!authedRef.current) {
        document.body.classList.add("print-locked");
        toast({ title: tRef.current("builder.printLocked"), variant: "destructive" });
      }
    };
    const onAfterPrint = () => document.body.classList.remove("print-locked");
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        exportRef.current();
      }
    };
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const merged = await llm.regenerateCV(data);
      setData(merged);
      toast({ title: "Förbättrat", description: "Texten har förfinats." });
    } catch (e) {
      toast({ title: "Kunde inte förbättra", variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  const saveCV = async (name) => {
    const titel = (name && name.trim()) || data.titel || "Min CV";
    setSaving(true);
    try {
      const ok = await auth.requireAuth({ draft: { data, templateId, layout }, nextUrl: nextUrl() });
      if (!ok) return;
      const payload = { titel, data, templateId, layout };
      if (currentCvId) {
        await cvRepository.update(currentCvId, payload);
        toast({ title: "تم الحفظ", description: titel });
        setSaveOpen(false);
      } else {
        const rec = await cvRepository.create(payload);
        setCurrentCvId(rec.id);
        navigate(`/builder/${rec.id}`, { replace: true });
        toast({ title: "تم حفظ السيرة", description: titel });
        setSaveOpen(false);
      }
    } catch (e) {
      toast({ title: "تعذّر الحفظ", description: "سجّل الدخول أولاً لحفظ سيرتك.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir={dir} className="h-screen bg-[#F8F9FA] text-slate-900 flex flex-col overflow-hidden" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <header className="no-print shrink-0 border-b border-slate-200 bg-white">
        <div className="px-5 py-3 flex items-center justify-between gap-3">
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowRight className="w-4 h-4" />
            <span>{t("builder.back")}</span>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowLayout(true)} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">{t("builder.layout")}</span>
            </button>
            <button onClick={() => setSaveOpen(true)} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
              <Save className="w-4 h-4" />
              <span>{t("builder.save")}</span>
            </button>
            {mode === "edit" && (
              <button onClick={() => setMode("preview")} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <Eye className="w-4 h-4" />
                <span>{t("builder.preview")}</span>
              </button>
            )}
            <button onClick={exportPDF} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-[#1B4FD8] text-white hover:bg-[#1640b0] transition-colors">
              {authChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{t("builder.pdf")}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {processing && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#1B4FD8]" />
            <p className="text-sm">{t("builder.processing")}</p>
          </div>
        )}
        {!processing && (
          <div ref={panelRef} className="flex-1 overflow-auto p-6 bg-slate-200/60 print:p-0 print:bg-white print:overflow-visible flex justify-center gap-4">
            <div className="no-print self-start sticky top-6 print:hidden">
              <CVSideToolbar
                mode={mode}
                onManualEdit={() => setMode("edit")}
                onToggleAgent={() => setAgentOpen((v) => !v)}
                agentOpen={agentOpen}
                onImprove={regenerate}
                regenerating={regenerating}
                processing={processing}
                data={data}
                onApply={(d) => setData(d)}
                templateId={templateId}
                onTemplateChange={setTemplateId}
              />
            </div>
            <div style={{ width: A4_W * scale, height: A4_H * scale }} className="print:w-auto print:h-auto">
              <div className="cv-scale-wrapper relative" style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: A4_W, height: A4_H }}>
                <div className="cv-print-area bg-white shadow-2xl" style={{ width: A4_W, minHeight: A4_H }}>
                  <CVPreview templateId={templateId} data={data} editable={mode === "edit"} actions={actions} layout={layout} />
                </div>
                {mode === "edit" && (
                  <div className="no-print pointer-events-none absolute left-0 right-0" style={{ top: A4_H }}>
                    <div className="border-t-2 border-dashed border-rose-300/80" />
                    <span className="text-[10px] text-rose-500 bg-white px-1 -mt-3 inline-block ml-2">{t("builder.pageBoundary")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="print-notice">{t("builder.printLocked")}</div>

      <CVAgent open={agentOpen} onClose={() => setAgentOpen(false)} data={data} onApply={(d) => setData(d)} />

      {showLayout && (
        <LayoutEditor
          layout={layout}
          hasSidebar={templateId !== "executive" && templateId !== "nordic"}
          onChange={setLayout}
          onClose={() => setShowLayout(false)}
        />
      )}

      {saveOpen && (
        <CVSaveDialog
          defaultTitel={currentCvId ? "" : (data.titel || "")}
          saving={saving}
          onSave={saveCV}
          onClose={() => setSaveOpen(false)}
        />
      )}

    </div>
  );
}