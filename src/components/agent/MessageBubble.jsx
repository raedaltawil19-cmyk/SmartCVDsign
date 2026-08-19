import { useState } from "react";
import { ChevronDown, Check, CheckCircle2, Copy, Loader2, XCircle, Wrench } from "lucide-react";

const STATUS_META = {
  pending: { icon: Loader2, spin: true, text: "بانتظار…", cls: "text-slate-400" },
  running: { icon: Loader2, spin: true, text: "جارٍ التنفيذ…", cls: "text-blue-500" },
  in_progress: { icon: Loader2, spin: true, text: "قيد المعالجة…", cls: "text-blue-500" },
  completed: { icon: CheckCircle2, spin: false, text: "اكتمل", cls: "text-emerald-600" },
  success: { icon: CheckCircle2, spin: false, text: "نجح", cls: "text-emerald-600" },
  failed: { icon: XCircle, spin: false, text: "فشل", cls: "text-red-500" },
  error: { icon: XCircle, spin: false, text: "خطأ", cls: "text-red-500" },
};

function prettyJson(str) {
  if (!str) return "";
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return typeof str === "string" ? str : JSON.stringify(str, null, 2);
  }
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const [expanded, setExpanded] = useState({});
  const [copied, setCopied] = useState(false);

  if (message.role === "system") return null;

  const copyMessage = async () => {
    const content = String(message.content || "").trim();
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "order-2" : ""}`}>
        {message.content && (
          isUser ? (
            <div className="bg-[#000066] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm">
              <p className="whitespace-pre-wrap">{message.content}</p>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={copyMessage}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 transition-colors"
                  aria-label="نسخ التقرير"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "تم النسخ" : "نسخ"}</span>
                </button>
              </div>
            </div>
          )
        )}

        {message.tool_calls?.map((tc, idx) => {
          const meta = STATUS_META[tc.status] || STATUS_META.pending;
          const failed = tc.status === "failed" || tc.status === "error";
          const proj = tc.display_projection || {};
          const hideDetails = proj.hide_details && proj.details_redacted;
          const isOpen = expanded[idx];
          const Icon = meta.icon;
          const label = failed ? (proj.error_label || meta.text) : (isOpen ? proj.active_label || meta.text : proj.label || meta.text);

          return (
            <div key={idx} className="mt-2 text-xs border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              <button
                onClick={() => hideDetails ? undefined : setExpanded((s) => ({ ...s, [idx]: !s[idx] }))}
                disabled={hideDetails}
                className={`w-full flex items-center gap-2 px-3 py-2 ${hideDetails ? "cursor-default" : "hover:bg-slate-100"} transition-colors`}
              >
                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-700">{tc.name}</span>
                <Icon className={`w-3.5 h-3.5 ${meta.cls} ${meta.spin ? "animate-spin" : ""}`} />
                <span className={`${meta.cls} font-medium`}>{label}</span>
                {!hideDetails && (
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 mr-auto transition-transform ${isOpen ? "rotate-180" : ""}`} />
                )}
              </button>
              {isOpen && !hideDetails && (
                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-200 bg-white">
                  {tc.arguments_string && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 mb-1">المعاملات:</p>
                      <pre className="text-[11px] text-slate-600 bg-slate-50 rounded p-2 overflow-x-auto font-mono" dir="ltr">{prettyJson(tc.arguments_string)}</pre>
                    </div>
                  )}
                  {tc.results != null && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 mb-1">النتيجة:</p>
                      <pre className="text-[11px] text-slate-600 bg-slate-50 rounded p-2 overflow-x-auto font-mono max-h-48" dir="ltr">{prettyJson(tc.results)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}