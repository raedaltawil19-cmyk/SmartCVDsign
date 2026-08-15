import { useState } from "react";
import { X, ShieldCheck } from "lucide-react";
import EvidenceCollectStep from "@/components/review/EvidenceCollectStep";
import ResearchSourcesView from "@/components/review/ResearchSourcesView";
import EvidenceDraftStep from "@/components/review/EvidenceDraftStep";
import { composeDraft, buildConfirmedEvidence, describeEvidenceError } from "@/lib/agent/reviewEvidence";

/**
 * Recommendation Evidence / Confirmation — مرحلة وسيطة قبل مساعد السيرة.
 * لا تكتب إلى SavedCV، ولا تُنشئ CV_ACTION، ولا تفتح مساعد السيرة.
 * الإرسال يحدث فقط عبر onConfirm بعد تأكيد المستخدم صراحةً.
 */
export default function EvidenceDialog({ request, index = 1, total = 1, onConfirm, onSkip, onCancel }) {
  const [step, setStep] = useState("collect");
  const [picked, setPicked] = useState([]);
  const [userText, setUserText] = useState("");
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const togglePick = (label) =>
    setPicked((p) => (p.includes(label) ? p.filter((x) => x !== label) : [...p, label]));

  const toDraft = () => {
    const nothingAdded = picked.length === 0 && !userText.trim();
    // الصياغة الجاهزة (draft) تكفي وحدها؛ أما ما يحتاج معلومة من المستخدم فلا يمضي بلا إضافة
    if (nothingAdded && !request.draft) {
      setError("أكّد معلومة واحدة على الأقل أو اكتب معلوماتك الخاصة.");
      return;
    }
    setError("");
    setText(
      nothingAdded
        ? request.draft
        : request.draft && !picked.length
          ? [request.draft, userText.trim()].filter(Boolean).join(" ")
          : composeDraft({ currentValue: request.currentValue, confirmed: picked, userText })
    );
    setStep("draft");
  };

  const confirm = () => {
    const res = buildConfirmedEvidence({ request, confirmed: picked, userText, finalText: text });
    if (!res.ok) { setError(describeEvidenceError(res.error)); return; }
    onConfirm(res.evidence);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
          <ShieldCheck className="w-4 h-4 text-[#000066]" />
          <h3 className="text-[13px] font-semibold text-slate-800">{request.title || "تأكيد المعلومات"}</h3>
          {total > 1 && <span className="text-[10px] text-slate-400">{index} / {total}</span>}
          <button onClick={onCancel} className="mr-auto text-slate-400 hover:text-slate-700 transition-colors" aria-label="إلغاء">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
            لم يتم تطبيق أي شيء بعد. لا تدخل أي معلومة إلى سيرتك إلا بعد تأكيدك، والتنفيذ يتم في مساعد السيرة بعد الضغط على زر التأكيد.
          </p>

          {/* بحث خارجي مجهَّز مسبقاً — عرض فقط، ولا يبدأ بحثاً جديداً ولا يصبح معلومة مؤكَّدة عن المستخدم */}
          {step === "collect" && request.research && <ResearchSourcesView research={request.research} />}

          {step === "collect" ? (
            <EvidenceCollectStep
              request={request}
              picked={picked}
              onPick={togglePick}
              userText={userText}
              onUserText={setUserText}
            />
          ) : (
            <EvidenceDraftStep
              request={request}
              confirmed={picked}
              text={text}
              onText={setText}
              editing={editing}
              onEdit={() => setEditing(true)}
            />
          )}

          {error && <p className="mt-2 text-[11px] text-amber-700">{error}</p>}
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-100 bg-slate-50">
          {step === "draft" ? (
            <>
              <button type="button" onClick={() => setStep("collect")} className="text-[12px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                رجوع
              </button>
              <button type="button" onClick={onSkip} className="text-[12px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                رفض التوصية
              </button>
              <button type="button" onClick={confirm} className="mr-auto text-[12px] px-3 py-1.5 rounded-lg bg-[#000066] text-white hover:bg-[#00003d] transition-colors">
                استخدام الاقتراح وإرساله للتنفيذ
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onSkip} className="text-[12px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                رفض التوصية
              </button>
              <button type="button" onClick={onCancel} className="text-[12px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                العودة إلى التوصيات
              </button>
              <button type="button" onClick={toDraft} className="mr-auto text-[12px] px-3 py-1.5 rounded-lg bg-[#000066] text-white hover:bg-[#00003d] transition-colors">
                تأكيد المعلومات وإعداد التعديل
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}