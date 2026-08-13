import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { LayoutTemplate, Target, RefreshCw, Loader2, Plus, Minus, Maximize, Undo2, Redo2, MessageSquare, ScrollText } from "lucide-react";
import CVTools from "./CVTools";
import JobMatchModal from "./JobMatchModal";
import TemplatePickerModal from "./TemplatePickerModal";

export default function CVSideToolbar({
  onImprove,
  regenerating,
  processing,
  data,
  onApply,
  templateId,
  onTemplateChange,
  scale,
  isFit,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomFit,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAgent,
  agentActive,
  onLog,
  logActive,
}) {
  const { t, dir } = useLanguage();
  const [jobOpen, setJobOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);

  const tip = dir === "rtl" ? "right-full mr-2" : "left-full ml-2";

  const Tip = ({ label, hint }) => (
    <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${tip} w-52 text-right text-[11px] bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50`}>
      <span className="block font-semibold">{label}</span>
      {hint && <span className="block text-slate-300 leading-relaxed mt-0.5">{hint}</span>}
    </span>
  );

  const Btn = ({ icon: Icon, label, hint, onClick, active, disabled, busy }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={hint ? `${label} — ${hint}` : label}
      className={`group relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${active ? "bg-[#000066] text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"} disabled:opacity-40`}
    >
      {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
      <Tip label={label} hint={hint} />
    </button>
  );

  const ZoomBtn = ({ children, label, hint, onClick, className }) => (
    <button onClick={onClick} title={`${label} — ${hint}`} className={`group relative ${className}`}>
      {children}
      <Tip label={label} hint={hint} />
    </button>
  );

  return (
    <>
      <div className="no-print shrink-0 w-14 flex flex-col items-center gap-1 py-2 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-visible">
        <div className="flex flex-col items-center gap-0.5">
          <ZoomBtn onClick={onZoomIn} label={t("builder.zoomIn")} hint="تكبير العرض لرؤية التفاصيل بدقة أكبر" className="w-8 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            <Plus className="w-4 h-4" />
          </ZoomBtn>
          <ZoomBtn
            onClick={isFit ? onZoomReset : onZoomFit}
            label={isFit ? "حجم 100%" : "ملاءمة العرض"}
            hint={isFit ? "إظهار الصفحة بحجمها الطبيعي" : "تصغير أو تكبير الصفحة لتناسب عرض الشاشة"}
            className={`w-10 h-7 rounded-lg flex items-center justify-center text-[11px] font-semibold transition-colors ${isFit ? "text-slate-500 hover:bg-slate-100" : "bg-[#000066] text-white"}`}
          >
            {isFit ? <Maximize className="w-3.5 h-3.5" /> : `${Math.round(scale * 100)}%`}
          </ZoomBtn>
          <ZoomBtn onClick={onZoomOut} label={t("builder.zoomOut")} hint="تصغير العرض لرؤية الصفحة كاملة" className="w-8 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            <Minus className="w-4 h-4" />
          </ZoomBtn>
        </div>
        <div className="w-8 h-px bg-slate-200 my-0.5" />
        <Btn icon={Undo2} label={t("builder.undo")} hint="إلغاء آخر تعديل والعودة خطوة للخلف" onClick={onUndo} disabled={!canUndo} />
        <Btn icon={Redo2} label={t("builder.redo")} hint="إعادة تنفيذ التعديل الذي تم إلغاؤه" onClick={onRedo} disabled={!canRedo} />
        <div className="w-8 h-px bg-slate-200 my-0.5" />
        <Btn icon={MessageSquare} label="مساعد السيرة" hint="اكتب أمراً بلغتك لتعديل أو ترتيب أو حذف أي جزء من سيرتك" onClick={onAgent} active={agentActive} />
        <Btn icon={ScrollText} label="سجل الإجراءات" hint="عرض كل التعديلات التي جرت على سيرتك بالترتيب" onClick={onLog} active={logActive} />
        <Btn icon={LayoutTemplate} label={t("builder.changeTemplate")} hint="اختيار شكل وتصميم آخر للسيرة مع بقاء بياناتك كما هي" onClick={() => setTplOpen(true)} />
        <Btn icon={Target} label={t("builder.matchJob")} hint="مطابقة سيرتك مع إعلان وظيفة وإبراز ما يهم صاحب العمل" onClick={() => setJobOpen(true)} />
        <Btn icon={RefreshCw} label={t("builder.improve")} hint="تحسين صياغة نصوص سيرتك بأسلوب أكثر احترافية" onClick={onImprove} disabled={regenerating || processing} busy={regenerating} />
        <div className="w-8 h-px bg-slate-200 my-1" />
        <CVTools data={data} onApply={onApply} iconOnly />
      </div>

      {jobOpen && <JobMatchModal data={data} onApply={onApply} onClose={() => setJobOpen(false)} />}
      {tplOpen && <TemplatePickerModal templateId={templateId} onChange={onTemplateChange} onClose={() => setTplOpen(false)} />}
    </>
  );
}