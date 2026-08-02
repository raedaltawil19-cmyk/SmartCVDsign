import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { TEMPLATES } from "@/lib/cvModel";
import { useToast } from "@/components/ui/use-toast";
import { FileText, Upload, ArrowLeft, Loader2, PencilLine } from "lucide-react";
import MyCVs from "@/components/MyCVs";

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
  const [templateId, setTemplateId] = useState("stockholm");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const canStart = text.trim().length > 20 || file;

  const start = async () => {
    if (!canStart) return;
    setBusy(true);
    let fileUrl = null;
    try {
      if (file) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        fileUrl = file_url;
      }
      navigate("/builder", { state: { templateId, text, fileUrl } });
    } catch (e) {
      toast({ title: "Något gick fel", description: "Kunde inte ladda upp filen. Försök igen.", variant: "destructive" });
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8F9FA] text-slate-900" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#1B4FD8] flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">CVcraft</span>
          <nav className="mr-4 flex items-center gap-1 text-sm">
            <Link to="/applications" className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">متتبّع الطلبات</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
            سيرة ذاتية احترافية بالسويدية
            <span className="block text-[#1B4FD8]">في دقائق</span>
          </h1>
          <p className="text-slate-500 mt-4 max-w-xl mx-auto text-lg leading-relaxed">
            اختر قالباً، أدخل بياناتك أو ارفع سيرتك القديمة، وسنقرأها ونُعبّئ القالب تحت العناوين المناسبة بأسلوب احترافي.
          </p>
        </div>

        <MyCVs />

        <section className="mb-10">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-400 mb-4 text-center">١. اختر القالب</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                className={`text-right rounded-2xl border-2 p-4 transition-all bg-white ${templateId === t.id ? "border-[#1B4FD8] ring-4 ring-[#1B4FD8]/10 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}
              >
                <div className="aspect-[3/4] rounded-lg overflow-hidden border border-slate-200 mb-3 bg-slate-50">
                  <MiniPreview id={t.id} />
                </div>
                <div className="font-semibold text-[15px]">{t.namn}</div>
                <div className="text-[13px] text-slate-500">{t.tagline}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-400 mb-4 text-center">٢. أدخل بياناتك</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <label className="text-sm font-medium text-slate-700 mb-2 block">اكتب نصاً حراً</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="الصق بياناتك هنا — مهاراتك، خبراتك السابقة، تعليمك، اللغات... بأي ترتيب وبأي لغة، وسنرتّبها ونترجمها للسويدية."
                rows={8}
                className="w-full text-[14px] leading-relaxed resize-none border border-slate-200 rounded-xl p-3 outline-none focus:border-[#1B4FD8] focus:ring-2 focus:ring-[#1B4FD8]/10"
              />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col">
              <label className="text-sm font-medium text-slate-700 mb-2 block">أو ارفع ملفاً قديماً</label>
              <label className={`flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${file ? "border-[#1B4FD8] bg-[#1B4FD8]/5" : "border-slate-200 hover:border-slate-300"}`}>
                <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                {file ? (
                  <>
                    <PencilLine className="w-6 h-6 text-[#1B4FD8]" />
                    <span className="text-sm font-medium text-slate-700 text-center px-4">{file.name}</span>
                    <span className="text-xs text-slate-400">اضغط لتغيير الملف</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-400" />
                    <span className="text-sm text-slate-500">PDF أو Word</span>
                    <span className="text-xs text-slate-400">اسحب أو اختر ملفاً</span>
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
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#1B4FD8] text-white font-medium shadow-lg shadow-[#1B4FD8]/20 hover:bg-[#1640b0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowLeft className="w-5 h-5" />}
            {busy ? "جرّى الرفع..." : "أنشئ سيرتي الذاتية"}
          </button>
        </div>
      </main>
    </div>
  );
}