import { useLanguage } from "@/lib/i18n";
import { TEMPLATES } from "@/lib/cvModel";
import { X, Check } from "lucide-react";

export default function TemplatePickerModal({ templateId, onChange, onClose }) {
  const { t, dir } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-auto" dir={dir} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <span className="font-medium text-slate-900">{t("builder.changeTemplate")}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEMPLATES.map((tpl) => {
            const active = tpl.id === templateId;
            return (
              <button
                key={tpl.id}
                onClick={() => { onChange(tpl.id); onClose(); }}
                className={`text-right rounded-xl border-2 p-4 transition-all ${active ? "border-[#1B4FD8] bg-[#1B4FD8]/5" : "border-slate-200 hover:border-slate-300"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-[15px]">{tpl.namn}</div>
                    <div className="text-[13px] text-slate-500">{tpl.tagline}</div>
                  </div>
                  {active && <Check className="w-5 h-5 text-[#1B4FD8] shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}