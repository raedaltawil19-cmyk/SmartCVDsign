import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { TEMPLATES } from "@/lib/cvModel";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n";
import { FileText, Upload, ArrowLeft, Loader2, PencilLine, Sparkles, Sparkle } from "lucide-react";
import MyCVs from "@/components/MyCVs";
import { suggestTemplates } from "@/lib/templateMatcher";

function MiniPreview({ id }) {
  if (id === "executive") {
    return (
      <div dir="ltr" className="w-full h-full bg-white p-3 flex flex-col items-center" style={{ fontFamily: "Georgia, serif" }}>
        <div className="text-[8px] tracking-widest uppercase font-semibold text-slate-900">Namn Efternamn</div>
        <div className="h-px w-10 bg-[#B08D57] my-1.5" />
        <div className="text-[6px] uppercase tracking-[0.25em] text-[#B08D57]">Titel</div>
        <div className="mt-3 w-full space-y-1.5">
          {[0.5, 0.7, 0.4].map((w, i) => <div key={i} className="h-1 rounded bg-slate-200" style={{ width: `${w * 100}%`, margin: "0 auto" }} />)}
        </div>
      </div>
    );
  }
  if (id === "techpro") {
    return (
      <div dir="ltr" className="w-full h-full bg-white" style={{ fontFamily: "system-ui" }}>
        <div className="bg-slate-900 p-2">
          <div className="h-1.5 w-16 bg-white rounded" />
          <div className="h-1 w-12 bg-blue-400 rounded mt-1" />
        </div>
        <div className="flex">
          <div className="flex-1 p-2 space-y-1">
            {[0.6, 0.4].map((w, i) => <div key={i} className="h-1 rounded bg-slate-200" style={{ width: `${w * 100}%` }} />)}
          </div>
          <div className="w-[35%] bg-slate-50 p-2 space-y-1.5">
            {[0.8, 0.6, 0.5].map((w, i) => <div key={i} className="h-0.5 rounded bg-slate-200"><div className="h-full bg-blue-600 rounded" style={{ width: `${w * 100}%` }} /></div>)}
          </div>
        </div>
      </div>
    );
  }
  if (id === "creative") {
    return (
      <div dir="ltr" className="w-full h-full bg-white flex flex-col" style={{ fontFamily: "system-ui" }}>
        <div className="p-1.5" style={{ background: "#0d9488" }}>
          <div className="h-1.5 w-14 bg-white rounded" />
          <div className="h-1 w-10 bg-white/70 rounded mt-1" />
        </div>
        <div className="flex flex-1">
          <div className="flex-1 p-2 space-y-1">
            {[0.6, 0.4].map((w, i) => <div key={i} className="h-1 rounded bg-slate-200" style={{ width: `${w * 100}%` }} />)}
          </div>
          <div className="w-[35%] p-2 space-y-1.5" style={{ background: "#f0fdfa" }}>
            {[0.8, 0.6].map((w, i) => <div key={i} className="h-1 rounded bg-teal-200" style={{ width: `${w * 100}%` }} />)}
          </div>
        </div>
      </div>
    );
  }
  if (id === "nordic") {
    return (
      <div dir="ltr" className="w-full h-full bg-white p-3 flex flex-col" style={{ fontFamily: "system-ui" }}>
        <div className="h-2 w-2/3 bg-slate-800 rounded-sm" />
        <div className="h-1 w-1/3 bg-slate-300 rounded mt-1" />
        <div className="h-px w-full bg-slate-200 my-2.5" />
        <div className="space-y-1.5">
          {[0.7, 0.5, 0.6].map((w, i) => <div key={i} className="h-1 rounded bg-slate-200" style={{ width: `${w * 100}%` }} />)}
        </div>
        <div className="h-px w-full bg-slate-200 my-2.5" />
        <div className="space-y-1.5">
          {[0.6, 0.4].map((w, i) => <div key={i} className="h-1 rounded bg-slate-200" style={{ width: `${w * 100}%` }} />)}
        </div>
      </div>
    );
  }
  return (
    <div dir="ltr" className="w-full h-full bg-white flex" style={{ fontFamily: "system-ui" }}>
      <div className="w-1/3 bg-slate-50 p-2 space-y-1">
        <div className="h-1 w-full bg-slate-200 rounded" />
        <div className="h-1 w-2/3 bg-slate-200 rounded" />
        <div className="h-1 w-3/4 bg-slate-200 rounded" />
      </div>
      <div className="flex-1 p-2 space-y-1.5">
        <div className="h-2 w-1/2 bg-slate-800 rounded" />
        <div className="h-1 w-1/3 bg-slate-300 rounded" />
        <div className="h-1 w-full bg-slate-200 rounded mt-2" />
        <div className="h-1 w-5/6 bg-slate-200 rounded" />
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { dir, t } = useLanguage();
  const [templateId, setTemplateId] = useState("stockholm");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [manuallySelected, setManuallySelected] = useState(false);

  const canStart = text.trim().length > 20 || file;

  // اقتراح القالب بناءً على النص الملصق (مطابقة كلمات مفتاحية — بدون LLM)
  const suggestions = text.trim().length >= 30 ? suggestTemplates(text) : [];
  const suggestedIds = new Set(suggestions.map((s) => s.templateId));
  const topSuggestion = suggestions[0] || null;

  const pickTemplate = (id) => {
    setTemplateId(id);
    setManuallySelected(true);
  };

  const start = async () => {
    if (!canStart) return;
    // إذا لم يختر المستخدم قالباً يدوياً، اعتمد الاقتراح الأعلى نقاطاً
    const finalTemplateId = manuallySelected
      ? templateId
      : (topSuggestion ? topSuggestion.templateId : templateId);
    setBusy(true);
    let fileUrl = null;
    try {
      if (file) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        fileUrl = file_url;
      }
      navigate("/builder", { state: { templateId: finalTemplateId, templateSource: manuallySelected ? "user" : "auto", text, fileUrl } });
    } catch (e) {
      toast({ title: "Något gick fel", description: "Kunde inte ladda upp filen. Försök igen.", variant: "destructive" });
      setBusy(false);
    }
  };

  return (
    <div dir={dir} className="min-h-screen bg-[#F5F5F5] text-slate-900" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#000066] flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">CVcraft</span>
          <nav className="mr-4 flex items-center gap-1 text-sm">
            <Link to="/agent" className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>مرشد السيرة</span>
            </Link>
            <Link to="/applications" className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">{t("nav.applications")}</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-12 rounded-3xl bg-[#000066] px-8 py-14 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
            {t("hero.title1")}
            <span className="block text-[#D9E830]">{t("hero.title2")}</span>
          </h1>
          <p className="text-white/80 mt-4 max-w-xl mx-auto text-lg leading-relaxed">
            {t("hero.subtitle")}
          </p>
        </div>

        <MyCVs />

        <section className="mb-10">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-400 mb-4 text-center">{t("home.step1")}</h2>
          {topSuggestion && (
            <p className="text-center text-[13px] text-slate-500 mb-4 max-w-xl mx-auto">
              بناءً على النص الذي أدخلته، أبرزنا القالب الأنسب بإطار أصفر — يمكنك اعتماده أو اختيار غيره.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TEMPLATES.map((tpl) => {
              const isSuggested = suggestedIds.has(tpl.id);
              const isTop = topSuggestion && topSuggestion.templateId === tpl.id;
              const isSelected = templateId === tpl.id;
              return (
                <button
                  key={tpl.id}
                  onClick={() => pickTemplate(tpl.id)}
                  className={`text-right rounded-2xl border-2 p-4 transition-all bg-white relative ${
                    isSelected
                      ? "border-[#000066] ring-4 ring-[#000066]/10 shadow-sm"
                      : isSuggested
                        ? "border-[#D9E830] ring-4 ring-[#D9E830]/40 shadow-md"
                        : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {isTop && !isSelected && (
                    <span className="absolute -top-2.5 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-[#D9E830] px-2.5 py-1 text-[11px] font-semibold text-black shadow">
                      <Sparkle className="w-3 h-3" />
                      الأنسب لسيرتك
                    </span>
                  )}
                  <div className="aspect-[3/4] rounded-lg overflow-hidden border border-slate-200 mb-3 bg-slate-50">
                    <MiniPreview id={tpl.id} />
                  </div>
                  <div className="font-semibold text-[15px]">{tpl.namn}</div>
                  <div className="text-[13px] text-slate-500">{tpl.tagline}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-400 mb-4 text-center">{t("home.step2")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <label className="text-sm font-medium text-slate-700 mb-2 block">{t("home.textLabel")}</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("home.textPlaceholder")}
                rows={8}
                className="w-full text-[14px] leading-relaxed resize-none border border-slate-200 rounded-xl p-3 outline-none focus:border-[#000066] focus:ring-2 focus:ring-[#000066]/10"
              />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col">
              <label className="text-sm font-medium text-slate-700 mb-2 block">{t("home.fileLabel")}</label>
              <label className={`flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${file ? "border-[#000066] bg-[#000066]/5" : "border-slate-200 hover:border-slate-300"}`}>
                <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                {file ? (
                  <>
                    <PencilLine className="w-6 h-6 text-[#000066]" />
                    <span className="text-sm font-medium text-slate-700 text-center px-4">{file.name}</span>
                    <span className="text-xs text-slate-400">{t("home.fileChange")}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-400" />
                    <span className="text-sm text-slate-500">{t("home.fileType")}</span>
                    <span className="text-xs text-slate-400">{t("home.fileHint")}</span>
                  </>
                )}
              </label>
            </div>
          </div>
        </section>

        <div className="flex justify-center">
          <button
            onClick={start}
            disabled={!canStart || busy}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#D9E830] text-black font-semibold shadow-lg shadow-black/10 hover:bg-[#c5d420] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowLeft className="w-5 h-5" />}
            {busy ? t("home.uploading") : t("home.start")}
          </button>
        </div>
      </main>
    </div>
  );
}