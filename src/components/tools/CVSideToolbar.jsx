import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { LayoutTemplate, Target, RefreshCw, Loader2, Plus, Minus, Maximize, Undo2, Redo2 } from "lucide-react";
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
}) {
  const { t, dir } = useLanguage();
  const [jobOpen, setJobOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);

  const tip = dir === "rtl" ? "right-full mr-2" : "left-full ml-2";

  const Btn = ({ icon: Icon, label, onClick, active, disabled, busy }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`group relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${active ? "bg-[#000066] text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"} disabled:opacity-40`}
    >
      {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
      <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${tip} whitespace-nowrap text-[11px] bg-slate-900 text-white px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-50`}>
        {label}
      </span>
    </button>
  );

  return (
    <>
      <div className="no-print shrink-0 w-14 flex flex-col items-center gap-1 py-2 bg-white rounded-2xl shadow-lg border border-slate-200 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="flex flex-col items-center gap-0.5">
          <button onClick={onZoomIn} title={t("builder.zoomIn")} className="w-8 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={isFit ? onZoomReset : onZoomFit} title={isFit ? "100%" : t("builder.fitWidth")} className={`w-10 h-7 rounded-lg flex items-center justify-center text-[11px] font-semibold transition-colors ${isFit ? "text-slate-500 hover:bg-slate-100" : "bg-[#000066] text-white"}`}>
            {isFit ? <Maximize className="w-3.5 h-3.5" /> : `${Math.round(scale * 100)}%`}
          </button>
          <button onClick={onZoomOut} title={t("builder.zoomOut")} className="w-8 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            <Minus className="w-4 h-4" />
          </button>
        </div>
        <div className="w-8 h-px bg-slate-200 my-0.5" />
        <Btn icon={Undo2} label={t("builder.undo")} onClick={onUndo} disabled={!canUndo} />
        <Btn icon={Redo2} label={t("builder.redo")} onClick={onRedo} disabled={!canRedo} />
        <div className="w-8 h-px bg-slate-200 my-0.5" />
        <Btn icon={LayoutTemplate} label={t("builder.changeTemplate")} onClick={() => setTplOpen(true)} />
        <Btn icon={Target} label={t("builder.matchJob")} onClick={() => setJobOpen(true)} />
        <Btn icon={RefreshCw} label={t("builder.improve")} onClick={onImprove} disabled={regenerating || processing} busy={regenerating} />
        <div className="w-8 h-px bg-slate-200 my-1" />
        <CVTools data={data} onApply={onApply} iconOnly />
      </div>

      {jobOpen && <JobMatchModal data={data} onApply={onApply} onClose={() => setJobOpen(false)} />}
      {tplOpen && <TemplatePickerModal templateId={templateId} onChange={onTemplateChange} onClose={() => setTplOpen(false)} />}
    </>
  );
}