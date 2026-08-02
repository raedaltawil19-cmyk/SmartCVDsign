import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Sparkles, Pencil, LayoutTemplate, Target, RefreshCw, Loader2 } from "lucide-react";
import CVTools from "./CVTools";
import JobMatchModal from "./JobMatchModal";
import TemplatePickerModal from "./TemplatePickerModal";

export default function CVSideToolbar({
  mode,
  onManualEdit,
  onToggleAgent,
  agentOpen,
  onImprove,
  regenerating,
  processing,
  data,
  onApply,
  templateId,
  onTemplateChange,
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
      className={`group relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${active ? "bg-[#1B4FD8] text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"} disabled:opacity-40`}
    >
      {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
      <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${tip} whitespace-nowrap text-[11px] bg-slate-900 text-white px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-50`}>
        {label}
      </span>
    </button>
  );

  return (
    <>
      <div className={`no-print shrink-0 w-14 flex flex-col items-center gap-1.5 py-3 bg-white ${dir === "rtl" ? "border-l" : "border-r"} border-slate-200`}>
        <Btn icon={Sparkles} label={t("builder.aiEdit")} onClick={onToggleAgent} active={agentOpen} />
        <Btn icon={Pencil} label={t("builder.manualEdit")} onClick={onManualEdit} active={mode === "edit"} />
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