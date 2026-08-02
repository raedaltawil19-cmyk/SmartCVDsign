import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { emptyCV, CV_SCHEMA, CV_PROCESS_PROMPT, mergeCV, TEMPLATES } from "@/lib/cvModel";
import { useToast } from "@/components/ui/use-toast";
import CVPreview from "@/components/CVPreview";
import CVAgent from "@/components/CVAgent";
import CVTools from "@/components/tools/CVTools";
import { ArrowRight, Download, Loader2, RefreshCw, Eye, X } from "lucide-react";

const A4_W = 794;
const A4_H = 1123;

export default function Builder() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const incoming = location.state;

  const [data, setData] = useState(emptyCV);
  const [templateId, setTemplateId] = useState(incoming?.templateId || "stockholm");
  const [processing, setProcessing] = useState(!!(incoming?.text || incoming?.fileUrl));
  const [regenerating, setRegenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const panelRef = useRef(null);
  const [scale, setScale] = useState(0.6);

  const openPreview = () => {
    setPreviewScale(Math.min(1, (window.innerWidth - 80) / A4_W));
    setShowPreview(true);
  };

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / A4_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const runProcess = useCallback(async (text, fileUrl) => {
    setProcessing(true);
    try {
      const prompt = CV_PROCESS_PROMPT + "\n\nAnvändarens inmatning (kan vara på valfritt språk, arrangera och översätt till svenska):\n" + (text || "(se filen)");
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrl ? [fileUrl] : undefined,
        response_json_schema: CV_SCHEMA
      });
      setData(mergeCV(res));
    } catch (e) {
      toast({ title: "Kunde inte läsa in informationen", description: "Försök igen eller redigera manuellt.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  }, [toast]);

  useEffect(() => {
    if (incoming?.text || incoming?.fileUrl) {
      runProcess(incoming.text || "", incoming.fileUrl);
    }
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

  const exportPDF = () => window.print();

  const regenerate = async () => {
    const flat = JSON.stringify(data);
    setRegenerating(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: "Förbättra och förfina följande befintliga CV-innehåll på svenska. Gör det mer naturligt och konkret, ta bort eventuella klyschor — men SAMMANFATTA INTE och FÖRKORTA INTE: bevara ALL information, alla ansvarsområden och resultat i sin helhet.\n\n" + flat,
        response_json_schema: CV_SCHEMA
      });
      setData(mergeCV(res));
      toast({ title: "Förbättrat", description: "Texten har förfinats." });
    } catch (e) {
      toast({ title: "Kunde inte förbättra", variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div dir="rtl" className="h-screen bg-[#F8F9FA] text-slate-900 flex flex-col overflow-hidden" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <header className="no-print shrink-0 border-b border-slate-200 bg-white">
        <div className="px-5 py-3 flex items-center justify-between gap-3">
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowRight className="w-4 h-4" />
            <span>القوالب</span>
          </button>
          <div className="flex items-center gap-2">
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-[#1B4FD8]"
            >
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.namn}</option>)}
            </select>
            <button onClick={regenerate} disabled={regenerating || processing} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-40">
              {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="hidden sm:inline">حسّن</span>
            </button>
            <CVTools data={data} onApply={(d) => setData(d)} />
            <button onClick={openPreview} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
              <Eye className="w-4 h-4" />
              <span>معاينة</span>
            </button>
            <button onClick={exportPDF} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-[#1B4FD8] text-white hover:bg-[#1640b0] transition-colors">
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {processing && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#1B4FD8]" />
            <p className="text-sm">نقرأ بياناتك ونرتّبها بالسويدية...</p>
          </div>
        )}
        {!processing && (
          <div ref={panelRef} className="flex-1 overflow-auto p-6 bg-slate-200/60 print:p-0 print:bg-white print:overflow-visible">
            <div style={{ width: A4_W * scale, height: A4_H * scale, margin: "0 auto" }} className="print:w-auto print:h-auto">
              <div className="cv-scale-wrapper relative" style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: A4_W, height: A4_H }}>
                <div className="cv-print-area bg-white shadow-2xl" style={{ width: A4_W, minHeight: A4_H }}>
                  <CVPreview templateId={templateId} data={data} editable={true} actions={actions} />
                </div>
                <div className="no-print pointer-events-none absolute left-0 right-0" style={{ top: A4_H }}>
                  <div className="border-t-2 border-dashed border-rose-300/80" />
                  <span className="text-[10px] text-rose-500 bg-white px-1 -mt-3 inline-block ml-2">— حدود الصفحة —</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <CVAgent data={data} onApply={(d) => setData(d)} />

      {showPreview && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col">
          <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
            <span className="font-medium text-slate-900">معاينة السيرة الذاتية</span>
            <div className="flex items-center gap-2">
              <button onClick={exportPDF} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-[#1B4FD8] text-white hover:bg-[#1640b0] transition-colors">
                <Download className="w-4 h-4" />
                <span>تنزيل PDF</span>
              </button>
              <button onClick={() => setShowPreview(false)} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <X className="w-4 h-4" />
                <span>إغلاق</span>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-6 flex justify-center bg-slate-100">
            <div style={{ width: A4_W * previewScale, height: A4_H * previewScale }}>
              <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left", width: A4_W, height: A4_H }}>
                <div className="bg-white shadow-2xl" style={{ width: A4_W, minHeight: A4_H }}>
                  <CVPreview templateId={templateId} data={data} editable={false} actions={actions} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}