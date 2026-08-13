import { useActionLog, clearActionLog } from "@/lib/actionLog";
import { ScrollText, Trash2, X, AlertCircle, MousePointer2, LayoutGrid, Sparkles, FileText } from "lucide-react";

const TYPE_META = {
  ai_command: { label: "أمر ذكي", icon: Sparkles, color: "text-[#1B4FD8]" },
  manual_edit: { label: "تعديل يدوي", icon: MousePointer2, color: "text-slate-600" },
  layout_change: { label: "إعادة ترتيب", icon: LayoutGrid, color: "text-teal-600" },
  template_change: { label: "تغيير قالب", icon: FileText, color: "text-amber-600" },
  ai_error: { label: "خطأ أمر", icon: AlertCircle, color: "text-red-500" },
};

const time = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

function summarize(entry) {
  const d = entry.detail || {};
  switch (entry.type) {
    case "ai_command":
      return d.error
        ? `فشل: «${d.command?.slice(0, 40) || ""}» — ${d.error}`
        : `«${(d.command || "").slice(0, 48)}»${d.layoutChanged ? " (غيّر الترتيب)" : ""}`;
    case "manual_edit":
      return d.field ? `حقل: ${d.field}` : "تعديل";
    case "layout_change":
      return d.source === "ai" ? `بواسطة الذكاء — ${d.detail || ""}` : `يدوي — ${d.detail || ""}`;
    case "template_change":
      return `إلى ${d.template || ""}`;
    default:
      return "";
  }
}

export default function ActionLogPanel({ open, onClose }) {
  const log = useActionLog();

  if (!open) return null;

  return (
    <div dir="rtl" className="no-print fixed bottom-3 left-3 z-50 w-[330px] max-w-[calc(100vw-1.5rem)] rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
      <div className="px-3 py-2 flex items-center justify-between bg-slate-900 text-white">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium">
          <ScrollText className="w-3.5 h-3.5" />
          سجل الإجراءات
          {log.length > 0 && <span className="bg-white/20 rounded-full px-1.5 text-[10px]">{log.length}</span>}
        </span>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/15 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {(
        <div className="max-h-[280px] overflow-y-auto">
          {log.length === 0 && (
            <div className="px-3 py-6 text-center text-[12px] text-slate-400">لا توجد إجراءات بعد. جرّب تعديلاً أو أمراً ذكياً.</div>
          )}
          {log.map((e) => {
            const meta = TYPE_META[e.type] || TYPE_META.manual_edit;
            const Icon = meta.icon;
            return (
              <div key={e.id} className="px-3 py-2 border-b border-slate-100 hover:bg-slate-50">
                <div className="flex items-start gap-2">
                  <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${meta.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-700">{meta.label}</span>
                      <span className="text-[10px] text-slate-400 tabular-nums">{time(e.ts)}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug mt-0.5 break-words">{summarize(e)}</p>
                  </div>
                </div>
              </div>
            );
          })}
          {log.length > 0 && (
            <button
              onClick={clearActionLog}
              className="w-full px-3 py-1.5 text-[11px] text-slate-500 hover:bg-slate-100 inline-flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> مسح السجل
            </button>
          )}
        </div>
      )}
    </div>
  );
}